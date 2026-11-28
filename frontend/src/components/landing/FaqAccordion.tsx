'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from './data';

/**
 * Native `<details>`/`<summary>` FAQ accordion with find-in-page discoverability,
 * reduced-motion CSS transitions, and accessible summary semantics (no headings inside `<summary>`).
 */
export default function FaqAccordion() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Perguntas Frequentes
        </span>
        <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Tudo o que a direção escolar precisa de saber
        </h2>
      </div>

      <div className="edulink-accordion space-y-3">
        {FAQ_ITEMS.map((item, idx) => (
          <details key={item.q} open={idx === 0} className="shadow-sm">
            <summary className="px-5 py-4 min-h-[52px] text-sm font-bold text-stone-900 hover:bg-stone-50 transition">
              <span>{item.q}</span>
              <span
                className="shrink-0 w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center"
                aria-hidden="true"
              >
                <ChevronDown className="edulink-accordion-chevron h-4 w-4" aria-hidden="true" />
              </span>
            </summary>
            <div className="px-5 pb-4 pt-2 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
