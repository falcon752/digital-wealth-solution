'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, MessageSquare, Book, PenSquare, X } from 'lucide-react';
import Link from 'next/link';

type MessageType = 'bot' | 'user' | 'options';

interface Option {
  label: string;
  action: string;
}

interface Message {
  id: string;
  type: MessageType;
  text?: string;
  options?: Option[];
}

const FAQS: Record<string, string> = {
  'What is DWP?': 'Digital Wealth Partners brings institutional custody, active portfolio management, and coordinated financial planning together under one fiduciary roof.',
  'Do I have to be an accredited investor': 'No, you do not have to be an accredited investor for all our services, though certain specialized strategies may require it. Contact us for specifics.',
  'What are your fees?': 'Our fee structure is transparent and typically based on a percentage of assets under management (AUM). Please reach out to our team via the contact page for a detailed breakdown.',
  'What service providers do you use?': 'We partner with industry-leading, qualified institutional custodians to ensure the highest level of security and compliance for your digital assets.',
  'What does onboarding look like?': 'Onboarding is fully guided, starting with an initial consultation, followed by secure account setup, funding, and customized strategy alignment.',
  'Do you work with international clients?': 'Yes, we work with select international clients depending on their jurisdiction and regulatory requirements.',
};

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          type: 'bot',
          text: 'Hi there! Welcome to Digital Wealth Partners!\nWhat can we help you with today?'
        },
        {
          id: '2',
          type: 'options',
          options: [
            { label: 'Common questions', action: 'common_questions' },
            { label: 'Learn about DWP', action: 'learn_about' },
            { label: 'Onboarding', action: 'onboarding' },
            { label: 'Help', action: 'help' },
            { label: 'Something else', action: 'something_else' },
          ]
        }
      ]);
    }
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOptionClick = (option: Option) => {
    // 1. Add user message
    const newMessages = [...messages];
    // Remove the last options block if it exists so they can't click it again
    if (newMessages[newMessages.length - 1]?.type === 'options') {
      newMessages.pop();
    }
    
    newMessages.push({
      id: Date.now().toString(),
      type: 'user',
      text: option.label
    });
    
    setMessages(newMessages);

    // 2. Add bot response with artificial delay
    setTimeout(() => {
      const responseMessages: Message[] = [];
      const timestamp = Date.now();

      switch (option.action) {
        case 'common_questions':
          responseMessages.push({
            id: timestamp.toString() + '1',
            type: 'bot',
            text: 'What is your question?'
          });
          responseMessages.push({
            id: timestamp.toString() + '2',
            type: 'options',
            options: [
              { label: 'What is DWP?', action: 'faq_What is DWP?' },
              { label: 'Do I have to be an accredited investor', action: 'faq_Do I have to be an accredited investor' },
              { label: 'What are your fees?', action: 'faq_What are your fees?' },
              { label: 'What service providers do you use?', action: 'faq_What service providers do you use?' },
              { label: 'What does onboarding look like?', action: 'faq_What does onboarding look like?' },
              { label: 'Do you work with international clients?', action: 'faq_Do you work with international clients?' },
              { label: 'More', action: 'common_questions' }
            ]
          });
          break;
          
        case 'learn_about':
          responseMessages.push({
            id: timestamp.toString() + '1',
            type: 'bot',
            text: 'Here is the link to our knowledge base, where you can learn all about DWP and our services!\n[Knowledge base](/about)\n\nDid that answer your question?'
          });
          responseMessages.push({
            id: timestamp.toString() + '2',
            type: 'options',
            options: [
              { label: 'Yes', action: 'end_chat' },
              { label: 'No', action: 'help' }
            ]
          });
          break;

        case 'onboarding':
          responseMessages.push({
            id: timestamp.toString() + '1',
            type: 'bot',
            text: 'Onboarding is fully guided, starting with an initial consultation, followed by secure account setup, funding, and customized strategy alignment.\n\nDid that answer your question?'
          });
          responseMessages.push({
            id: timestamp.toString() + '2',
            type: 'options',
            options: [
              { label: 'Yes', action: 'end_chat' },
              { label: 'No', action: 'help' }
            ]
          });
          break;

        case 'help':
        case 'something_else':
          responseMessages.push({
            id: timestamp.toString() + '1',
            type: 'bot',
            text: 'Please fill out our [contact form](/contact) or email us at support@digitalwealthpartnersllc.net and a team member will assist you shortly.'
          });
          responseMessages.push({
            id: timestamp.toString() + '2',
            type: 'options',
            options: [
              { label: 'Start new conversation', action: 'restart' }
            ]
          });
          break;

        case 'end_chat':
          responseMessages.push({
            id: timestamp.toString() + '1',
            type: 'bot',
            text: 'Conversation has ended.'
          });
          responseMessages.push({
            id: timestamp.toString() + '2',
            type: 'options',
            options: [
              { label: 'Start new conversation', action: 'restart' }
            ]
          });
          break;

        case 'restart':
          setMessages([]);
          return;

        default:
          if (option.action.startsWith('faq_')) {
            const question = option.action.replace('faq_', '');
            responseMessages.push({
              id: timestamp.toString() + '1',
              type: 'bot',
              text: FAQS[question] || 'I am sorry, I do not have the answer to that right now.'
            });
            responseMessages.push({
              id: timestamp.toString() + '2',
              type: 'bot',
              text: 'Did that answer your question?'
            });
            responseMessages.push({
              id: timestamp.toString() + '3',
              type: 'options',
              options: [
                { label: 'Yes', action: 'end_chat' },
                { label: 'No', action: 'common_questions' }
              ]
            });
          }
          break;
      }

      setMessages(prev => [...prev, ...responseMessages]);
    }, 500);
  };

  const renderTextWithLinks = (text: string) => {
    // Basic markdown link parser for [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <Link key={match.index} href={match[2]} className="underline font-medium hover:text-opacity-80 transition-colors">
          {match[1]}
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Handle newlines
    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return <span key={i}>{part.split('\n').map((line, j) => <span key={j}>{line}<br/></span>)}</span>;
      }
      return part;
    });
  };

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform duration-300 hover:scale-105 focus:outline-none ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        style={{ backgroundColor: '#2C3342' }}
        aria-label="Launch chat"
      >
        <MessageSquare className="w-6 h-6" fill="currentColor" />
      </button>

      {/* ── Chat Window ── */}
      <div
        className={`fixed z-50 flex flex-col bg-white transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}
          md:bottom-6 md:right-6 md:w-[380px] md:h-[650px] md:rounded-[12px] md:shadow-2xl
          bottom-0 right-0 w-full h-[100dvh] md:h-[650px]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Image
              src="/dwp-logo.png"
              alt="Digital Wealth Partners"
              width={140}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button aria-label="New chat" className="hover:text-gray-600 transition-colors" onClick={() => setMessages([])}>
              <PenSquare className="w-5 h-5" />
            </button>
            <button aria-label="Close chat" className="hover:text-gray-600 transition-colors" onClick={() => setIsOpen(false)}>
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6 scroll-smooth">
          {messages.map((msg, idx) => {
            if (msg.type === 'bot') {
              // Only show 'Digital Wealth Partners Bot' if the previous message wasn't from the bot
              const showName = idx === 0 || messages[idx - 1].type !== 'bot';
              return (
                <div key={msg.id} className="flex flex-col items-start gap-1">
                  {showName && (
                    <span className="text-[13px] font-semibold text-gray-500 mb-1">
                      Digital Wealth Partners Bot
                    </span>
                  )}
                  <div className="text-[16px] text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {renderTextWithLinks(msg.text || '')}
                  </div>
                </div>
              );
            }
            
            if (msg.type === 'user') {
              return (
                <div key={msg.id} className="flex flex-col items-end w-full mt-2">
                  <div 
                    className="px-5 py-3 rounded-[20px] text-white text-[15px]"
                    style={{ backgroundColor: '#2C3342' }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            }

            if (msg.type === 'options' && msg.options) {
              const isRestart = msg.options.length === 1 && msg.options[0].action === 'restart';
              
              if (isRestart) {
                return (
                  <div key={msg.id} className="flex flex-col items-center mt-6 w-full">
                    <button
                      onClick={() => handleOptionClick(msg.options![0])}
                      className="px-6 py-3 rounded-[24px] text-white text-[15px] font-semibold transition-opacity hover:opacity-90 w-full md:w-auto"
                      style={{ backgroundColor: '#2C3342' }}
                    >
                      {msg.options![0].label}
                    </button>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-wrap items-end justify-end gap-2 mt-4 w-full pl-8">
                  {msg.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      className="px-4 py-2.5 rounded-[20px] border border-gray-200 text-gray-800 text-[14px] bg-white hover:bg-gray-50 transition-colors text-right"
                      style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
            return null;
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Tabs */}
        <div className="p-4 shrink-0 bg-white">
          <div className="flex items-center w-full bg-gray-100 rounded-xl p-1">
            <div className="flex-1 flex items-center justify-center gap-2 bg-white rounded-lg py-2.5 shadow-sm">
              <MessageSquare className="w-4 h-4 text-gray-800" />
              <span className="text-[14px] font-semibold text-gray-900">Conversation</span>
            </div>
            <Link href="/contact" className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-gray-200/50 rounded-lg transition-colors">
              <Book className="w-4 h-4 text-gray-600" />
              <span className="text-[14px] font-semibold text-gray-600">Help center</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
