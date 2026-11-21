"use client";

import { useState, type ReactNode } from "react";
import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";

/**
 * Collects the CSS that MUI/Emotion generates while a page renders on the server and puts it
 * in the HTML, so pages arrive styled (no flash of unstyled content). The standard App Router
 * recipe (what @mui/material-nextjs does), kept here because that package doesn't list
 * Next 16 yet.
 */
interface Inserted {
  name: string;
  /** Global styles (CssBaseline: body background, fonts) get their own tags, see below. */
  isGlobal: boolean;
}

export default function EmotionRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache: EmotionCache = createCache({ key: "mui" });
    cache.compat = true;
    const insertOriginal = cache.insert.bind(cache);
    let inserted: Inserted[] = [];
    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push({ name: serialized.name, isGlobal: !selector });
      }
      return insertOriginal(...args);
    };
    const flush = () => {
      const names = inserted;
      inserted = [];
      return names;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const items = flush();
    if (items.length === 0) return null;
    let styles = "";
    let dataEmotion = cache.key;
    const globals: { name: string; style: string }[] = [];
    for (const { name, isGlobal } of items) {
      const style = cache.inserted[name];
      if (typeof style !== "string") continue;
      if (isGlobal) {
        globals.push({ name, style });
      } else {
        styles += style;
        dataEmotion += ` ${name}`;
      }
    }
    return (
      <>
        {/* One tag per global style, marked "<key>-global": Emotion takes these over on the
            client and removes them when they change (e.g. the body background when switching
            to dark mode). Mixed into the shared tag they would stay forever. */}
        {globals.map(({ name, style }) => (
          <style
            key={name}
            data-emotion={`${cache.key}-global ${name}`}
            dangerouslySetInnerHTML={{ __html: style }}
          />
        ))}
        {styles && (
          <style
            key={cache.key}
            data-emotion={dataEmotion}
            dangerouslySetInnerHTML={{ __html: styles }}
          />
        )}
      </>
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
