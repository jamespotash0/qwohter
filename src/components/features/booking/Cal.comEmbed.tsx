import React, { useEffect } from 'react';

// Declare Cal on window for TypeScript
declare global {
  interface Window {
    Cal: any;
  }
}

interface CalComEmbedProps {
  calLink?: string; // Your Cal.com booking link
}

export const CalComEmbed: React.FC<CalComEmbedProps> = ({
  calLink = 'james-potash-pa18xe/30min'
}) => {
  useEffect(() => {
    // @ts-ignore - Cal.com embed script
    (function (C, A, L) {
      let p = function (a: any, ar: any) {
        a.q.push(ar);
      };
      let d = C.document;
      // @ts-ignore
      C.Cal = C.Cal || function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          // @ts-ignore
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          // @ts-ignore
          api.q = api.q || [];
          typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    // @ts-ignore
    Cal("init", { origin: "https://cal.com" });

    // @ts-ignore
    Cal("inline", {
      elementOrSelector: "#cal-inline",
      calLink: calLink,
      layout: "month_view"
    });

    // @ts-ignore
    Cal("ui", {
      styles: { branding: { brandColor: "#ee6c4d" } },
      hideEventTypeDetails: false,
      layout: "month_view"
    });
  }, [calLink]);

  return (
    <div className="rounded-[22px] overflow-hidden bg-white">
      <div id="cal-inline" style={{ width: '100%', height: '650px', minHeight: '650px', overflow: 'scroll' }} />
    </div>
  );
};
