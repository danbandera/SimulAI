import { ApexOptions } from "apexcharts";
import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { Scenario } from "../../api/scenarios.api";
import { useScenarios } from "../../context/ScenarioContext";
import { log } from "console";

interface ChartOneState {
  series: {
    name: string;
    data: number[];
  }[];
}

interface ChartOneProps {
  scenario: {
    id?: number;
    aspects?: string;
  };
}

const ChartOne: React.FC<ChartOneProps> = ({ scenario }) => {
  const { getConversations } = useScenarios();
  const [state, setState] = useState<ChartOneState>({
    series: [
      {
        name: "Calificación",
        data: [],
      },
    ],
  });

  // Fetch conversations when component mounts
  useEffect(() => {
    const fetchConversations = async () => {
      if (scenario && scenario.id) {
        try {
          console.log("Scenario aspects:", scenario.aspects);
          const conversations = await getConversations(scenario.id);
          console.log(
            `Conversations for scenario ${scenario.id}:`,
            conversations,
          );

          // Process conversations to extract aspect scores
          if (
            conversations &&
            conversations.length > 0 &&
            scenario.aspects &&
            scenario.aspects.length > 0
          ) {
            // Initialize scores array with zeros
            const aspectScores = scenario.aspects.map(() => 0);

            // Get the most recent conversation
            const latestConversation = conversations[conversations.length - 1];
            // Get the last message from the conversation
            const lastMessage =
              latestConversation.conversation[
                latestConversation.conversation.length - 1
              ];
            console.log("Last message:", lastMessage.message);

            // Extract aspect scores from the message
            scenario.aspects.forEach((aspect, index) => {
              // Try different patterns to match aspect scores
              // Pattern 1: "Aspecto Amigable: 85"
              // Pattern 2: "Aspecto Amigable - 85"
              // Pattern 3: "Aspecto Amigable 85"
              const patterns = [
                new RegExp(`${aspect.label}\\s*:\\s*(\\d+)`, "i"),
                new RegExp(`${aspect.label}\\s*-\\s*(\\d+)`, "i"),
                new RegExp(`${aspect.label}\\s+(\\d+)`, "i"),
                // Also try with the value field
                new RegExp(`${aspect.value}\\s*:\\s*(\\d+)`, "i"),
                new RegExp(`${aspect.value}\\s*-\\s*(\\d+)`, "i"),
                new RegExp(`${aspect.value}\\s+(\\d+)`, "i"),
              ];

              // Try each pattern until we find a match
              let score = 0;
              for (const pattern of patterns) {
                const match = lastMessage.message.match(pattern);
                if (match) {
                  score = parseInt(match[1]);
                  console.log(
                    `Found aspect ${aspect.label || aspect.value} with score ${score} using pattern ${pattern}`,
                  );
                  break;
                }
              }

              // If we found a score, update the array
              if (score > 0) {
                aspectScores[index] = score;
              }
            });

            // Update chart data with extracted scores
            setState({
              series: [
                {
                  name: "Calificación",
                  data: aspectScores,
                },
              ],
            });
          }
        } catch (error) {
          console.error(
            `Error fetching conversations for scenario ${scenario.id}:`,
            error,
          );
        }
      }
    };

    fetchConversations();
  }, [scenario, getConversations]);

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#3C50E0"],
    chart: {
      fontFamily: "Satoshi, sans-serif",
      height: 335,
      type: "area",
      dropShadow: {
        enabled: true,
        color: "#623CEA14",
        top: 10,
        blur: 4,
        left: 0,
        opacity: 0.1,
      },
      toolbar: {
        show: false,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 500,
          },
        },
      },
    ],
    stroke: {
      width: [2],
      curve: "straight",
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      colors: "#fff",
      strokeColors: ["#3056D3"],
      strokeWidth: 3,
      strokeOpacity: 0.9,
      strokeDashArray: 0,
      fillOpacity: 1,
      discrete: [],
      hover: {
        size: undefined,
        sizeOffset: 5,
      },
    },
    xaxis: {
      type: "category",
      categories: scenario.aspects?.map((aspect) => aspect.label) || [],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "12px",
        },
        rotate: 0,
        rotateAlways: true,
      },
    },
    yaxis: {
      title: {
        style: {
          fontSize: "0px",
        },
      },
      min: 0,
      max: 100,
      tickAmount: 10,
      labels: {
        formatter: function (val) {
          return val.toFixed(0);
        },
      },
    },
  };

  const handleReset = () => {
    setState((prevState) => ({
      ...prevState,
    }));
  };
  handleReset;

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="flex w-full flex-wrap gap-3 sm:gap-5">
          <div className="flex min-w-47.5">
            <span className="mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-primary">
              <span className="block h-2.5 w-full max-w-2.5 rounded-full bg-primary"></span>
            </span>
            <div className="w-full">
              <p className="font-semibold text-primary">Aspectos</p>
              <p className="text-sm font-medium">Calificación por aspecto</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div id="chartOne" className="-ml-5">
          <ReactApexChart
            options={options}
            series={state.series}
            type="area"
            height={200}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartOne;
