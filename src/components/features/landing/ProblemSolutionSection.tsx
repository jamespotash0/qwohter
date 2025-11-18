import React, { useState } from "react";
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

const solutionItems = [
  {
    number: "1",
    title: "Create accurate quotes faster:",
    description:
      "Automated calculations, built-in product libraries, and intelligent templates reduce quote creation time by up to 70%.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-16.png",
    alignment: "left",
  },
  {
    number: "2",
    title: "Eliminate errors with smart validation:",
    description:
      "Real-time validation, pricing rule engines, and automatic updates ensure every quote is accurate and professional.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-17.png",
    alignment: "right",
  },
  {
    number: "3",
    title: "Professional, branded documents:",
    description:
      "Customizable templates and automated formatting deliver consistent, polished quotes that strengthen your brand.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-18.png",
    alignment: "left",
  },
  {
    number: "4",
    title: "Scale with confidence:",
    description:
      "Track every quote, analyze team performance, and gain pipeline visibility—all from a centralized platform built to grow with your business.",
    image: "https://c.animaapp.com/mi3nizw3ab7ONs/img/image-19.png",
    alignment: "right",
  },
];

export const ProblemSolutionSection = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>("problem");

  const currentItems = activeTab === "problem" ? problemItems : solutionItems;

  return (
    <section className="w-full pt-[75px] pb-[30px] bg-[#FFFEFA] relative">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 lg:px-12 xl:px-16 2xl:px-24 [@media(min-width:1700px)]:px-32 [@media(min-width:1850px)]:px-[200px]">
        <div className="flex flex-col items-center gap-[30px]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:0ms]"
          >
            <TabsList className="bg-[#f7f2e9] rounded-[30px] p-2.5 h-auto">
              <TabsTrigger
                value="problem"
                className="data-[state=active]:bg-[#ee6c4d] data-[state=inactive]:bg-[#fbf8f1] hover:bg-[#ee6c4d] rounded-3xl px-[30px] py-2.5 [font-family:'Urbanist',Helvetica] font-semibold text-base text-center tracking-[0] leading-6 data-[state=active]:text-white data-[state=inactive]:text-neutral-900 hover:text-white transition-colors"
              >
                Problem Statement
              </TabsTrigger>
              <TabsTrigger
                value="solution"
                className="data-[state=active]:bg-[#ee6c4d] data-[state=inactive]:bg-[#fbf8f1] hover:bg-[#ee6c4d] rounded-3xl px-[30px] py-2.5 [font-family:'Urbanist',Helvetica] font-semibold text-base text-center tracking-[0] leading-6 data-[state=active]:text-white data-[state=inactive]:text-neutral-900 hover:text-white transition-colors"
              >
                Solution Statement
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div
            key={activeTab}
            className="flex flex-col items-center gap-2.5 max-w-[700px] px-4 animate-[slideIn_0.5s_ease-in-out]"
          >
            <h2 className="w-full bg-[linear-gradient(180deg,rgba(23,23,23,1)_0%,rgba(119,119,119,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Urbanist',Helvetica] font-semibold text-transparent text-2xl md:text-3xl lg:text-[42px] text-center tracking-[0] leading-tight lg:leading-[50px]">
              {activeTab === "problem" ? "Problem Statement" : "Solution Statement"}
            </h2>

            <p className="w-full [font-family:'Urbanist',Helvetica] font-normal text-[#343432] text-base md:text-lg lg:text-xl text-center tracking-[0] leading-relaxed lg:leading-[30px]">
              {activeTab === "problem"
                ? "Many small businesses rely on Google Docs, spreadsheets, or other manual tools to create quotes and proposals. This process is:"
                : "Qwohter streamlines the quoting process with powerful automation, customization, and collaboration tools. Our platform helps you:"
              }
            </p>
          </div>

          <div
            key={`${activeTab}-content`}
            className="flex flex-col w-full max-w-[1520px] mx-auto animate-[slideIn_0.5s_ease-in-out] space-y-8 xl:space-y-[50px]"
          >
            {currentItems.map((item, index) => (
              <div
                key={index}
                className={`flex flex-col xl:flex-row items-center gap-8 md:gap-12 xl:gap-20 2xl:gap-24 [@media(min-width:1850px)]:gap-[100px] ${
                  item.alignment === "right" ? "xl:flex-row-reverse" : ""
                }`}
              >
                {/* Text Container: proportional sizing */}
                <div className="flex items-start gap-5 w-full xl:w-[40%] h-auto">
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

                {/* Image: proportional scaling, maintains aspect ratio */}
                <img
                  className="flex-shrink-0 rounded-lg w-full xl:w-[54%] h-auto object-cover"
                  alt={`Problem ${item.number}`}
                  src={item.image}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
