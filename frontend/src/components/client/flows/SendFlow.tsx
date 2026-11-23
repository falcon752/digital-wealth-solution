'use client';

/**
 * Send: the withdraw flow worded as "Send", starting from "Which asset would you like to send?"
 * (each asset with its available balance). Picking one carries on into the same Amount →
 * Destination → Review → Security code steps, so there is one copy of the withdrawal logic.
 */
import type { FlowProps } from '../actions';
import WithdrawFlow from './WithdrawFlow';

export default function SendFlow(props: FlowProps) {
  return <WithdrawFlow {...props} params={{ ...props.params, mode: 'send' }} />;
}
