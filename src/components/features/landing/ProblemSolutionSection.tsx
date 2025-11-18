import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const problemItems = [
  {
    number: "1",
    title: "Unstructured and inefficient:",
    description:
      "Teams spend excessive time formatting, calculating, and double-checking numbers.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-16.png",
    alignment: "left",
  },
  {
    number: "2",
    title: "Prone to errors:",
    description:
      "Manual entry leads to mistakes in pricing, calculations, and product specifications.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-17.png",
    alignment: "right",
  },
  {
    number: "3",
    title: "Inconsistent:",
    description:
      "Quotes lack a standardized look and feel, reducing brand professionalism.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-18.png",
    alignment: "left",
  },
  {
    number: "4",
    title: "Unscalable:",
    description:
      "As businesses grow, it becomes harder to manage pipelines, track quote status, and gain insights into team performance.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-19.png",
    alignment: "right",
  },
];

export const ProblemSolutionSection = (): JSX.Element => {
  return (
    <section className="w-full px-5 py-[75px] relative">
      <div className="max-w-[1520px] mx-auto">
        <div className="flex flex-col items-center gap-12">
          <Tabs
            defaultValue="problem"
            className="w-auto translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:0ms]"
          >
            <TabsList className="bg-[#f7f2e9] rounded-[30px] p-2.5 h-auto">
              <TabsTrigger
                value="problem"
                className="bg-[#ee6c4d] data-[state=active]:bg-[#ee6c4d] data-[state=inactive]:bg-[#fbf8f1] rounded-3xl px-[30px] py-2.5 [font-family:'Urbanist',Helvetica] font-semibold text-base text-center tracking-[0] leading-6 text-white data-[state=inactive]:text-neutral-900 transition-colors"
              >
                Problem Statement
              </TabsTrigger>
              <TabsTrigger
                value="solution"
                className="bg-[#fbf8f1] data-[state=active]:bg-[#ee6c4d] data-[state=inactive]:bg-[#fbf8f1] rounded-3xl px-[30px] py-2.5 [font-family:'Urbanist',Helvetica] font-semibold text-base text-center tracking-[0] leading-6 data-[state=active]:text-white text-neutral-900 transition-colors"
              >
                Solution Statement
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col items-center gap-2.5 max-w-[700px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
            <h2 className="w-full bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-[42px] text-center tracking-[0] leading-[50px]">
              Problem Statement
            </h2>

            <p className="w-full [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-xl text-center tracking-[0] leading-[30px]">
              Many small businesses rely on Google Docs, spreadsheets, or other
              manual tools to create quotes and proposals. This process is:
            </p>
          </div>

          <div className="flex flex-col gap-[150px] w-full mt-12">
            {problemItems.map((item, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center translate-y-[-1rem] animate-fade-in opacity-0 ${
                  item.alignment === "right" ? "lg:flex-row-reverse" : ""
                }`}
                style={
                  {
                    "--animation-delay": `${400 + index * 200}ms`,
                  } as React.CSSProperties
                }
              >
                {item.alignment === "left" ? (
                  <>
                    <div className="flex items-start gap-5">
                      <div className="flex-shrink-0 w-8 h-10 flex items-center">
                        <Badge className="bg-[#ee6c4d] hover:bg-[#ee6c4d] rounded-3xl px-0 py-0.5 w-7 h-7 flex items-center justify-center">
                          <span className="[font-family:'Urbanist',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-6">
                            {item.number}
                          </span>
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2.5 flex-1">
                        <h3 className="[font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-3xl tracking-[0] leading-10">
                          {item.title}
                        </h3>

                        <p className="[font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <img
                        className="w-full max-w-[920px] h-auto"
                        alt={`Problem ${item.number}`}
                        src={item.image}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-start order-2 lg:order-1">
                      <img
                        className="w-full max-w-[920px] h-auto"
                        alt={`Problem ${item.number}`}
                        src={item.image}
                      />
                    </div>

                    <div className="flex items-start gap-5 order-1 lg:order-2">
                      <div className="flex-shrink-0 w-8 h-10 flex items-center">
                        <Badge className="bg-[#ee6c4d] hover:bg-[#ee6c4d] rounded-3xl px-0 py-0.5 w-7 h-7 flex items-center justify-center">
                          <span className="[font-family:'Urbanist',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-6">
                            {item.number}
                          </span>
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2.5 flex-1">
                        <h3 className="[font-family:'Urbanist',Helvetica] font-semibold text-neutral-900 text-3xl tracking-[0] leading-10">
                          {item.title}
                        </h3>

                        <p className="[font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base tracking-[0] leading-6">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
