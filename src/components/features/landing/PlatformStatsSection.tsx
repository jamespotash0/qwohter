import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const metricsData = [
  {
    label: "More Deals Won",
    value: "35%",
    description: "Close opportunities with confidence and predictably.",
  },
  {
    label: "Faster Quote Turnaround",
    value: "40%",
    description: "Turn quotes around faster and predictably.",
  },
  {
    label: "Faster Form Creation",
    value: "50%",
    description: "Generate forms with speed and precision.",
  },
  {
    label: "Time Saved with Custom Forms",
    value: "60%",
    description: "Gain hours back with streamlined custom forms.",
  },
  {
    label: "Fewer Errors in Quotes",
    value: "90%",
    description: "Minimize mistakes with consistent, precise quotes.",
  },
  {
    label: "Brand Consistency",
    value: "100%",
    description: "Ensure brand alignment across all your documents.",
  },
];

export const PlatformStatsSection = (): JSX.Element => {
  return (
    <section className="w-full flex flex-col items-center gap-[50px] pt-[150px] pb-[75px] px-5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
      <header className="flex flex-col items-center gap-2.5 max-w-4xl">
        <h2 className="bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-[42px] text-center tracking-[0] leading-[50px]">
          Results you&apos;ll feel — and your business will measure
        </h2>

        <p className="[font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-xl text-center tracking-[0] leading-[30px]">
          Turn every workflow into impact you can see, track, and scale.
        </p>
      </header>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start gap-[30px] pb-4">
          {metricsData.map((metric, index) => (
            <Card
              key={index}
              className="flex-shrink-0 w-[360px] bg-white rounded-[30px] border border-solid border-[#f7f2e9] translate-y-[-1rem] animate-fade-in opacity-0 transition-[transform,box-shadow] hover:scale-[1.02]"
              style={
                {
                  "--animation-delay": `${400 + index * 100}ms`,
                } as React.CSSProperties
              }
            >
              <CardContent className="flex flex-col items-start gap-5 p-[30px]">
                <Badge className="bg-[#ee6c4d1a] inline-flex items-center justify-center gap-[30px] px-2.5 py-0.5 rounded-3xl border border-solid border-[#ee6c4d1a] hover:bg-[#ee6c4d1a]">
                  <span className="[font-family:'Urbanist',Helvetica] font-semibold text-[#ee6c4d] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {metric.label}
                  </span>
                </Badge>

                <div className="[font-family:'Urbanist',Helvetica] font-normal text-neutral-900 text-[40px] tracking-[0] leading-[50px] whitespace-nowrap">
                  {metric.value}
                </div>

                <p className="w-[300px] [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-xl tracking-[0] leading-[30px]">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};
