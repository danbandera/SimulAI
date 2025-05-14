import { ApexOptions } from "apexcharts";
import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { useScenarios } from "../../context/ScenarioContext";

interface ChartTwoState {
  series: {
    name: string;
    data: string[];
  }[];
}

interface ChartTwoProps {
  scenario: {
    id?: number;
    aspects?: string;
  };
}

const ChartTwo: React.FC<ChartTwoProps> = ({ scenario }) => {
  const { getConversations } = useScenarios();
  console.log("Scenario aspects:", scenario.aspects);
  const [state, setState] = useState<ChartTwoState>({
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
            // Initialize arrays to track scores and counts for averaging
            const aspectScores = scenario.aspects.map(() => 0);
            const aspectCounts = scenario.aspects.map(() => 0);

            // Process all conversations to extract scores
            conversations.forEach((conversation) => {
              // Get the last message from each conversation
              const lastMessage =
                conversation.conversation[conversation.conversation.length - 1];

              // Skip if the message doesn't exist
              if (!lastMessage || !lastMessage.message) return;

              console.log("Processing message:", lastMessage.message);

              // Extract aspect scores from the message
              if (scenario.aspects) {
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

                  // If we found a score, add it to the running total
                  if (score > 0) {
                    aspectScores[index] += score;
                    aspectCounts[index]++;
                  }
                });
              }
            });

            // Calculate averages for each aspect
            const averageScores = aspectScores.map((total, index) => {
              const count = aspectCounts[index];
              return count > 0 ? (total / count).toFixed(2) : 0;
            });

            console.log("Average scores:", averageScores);

            // Update chart data with average scores
            setState({
              series: [
                {
                  name: "Calificación Promedio",
                  data: averageScores,
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

  // Define chart options
  const options: ApexOptions = {
    colors: ["#3C50E0"],
    chart: {
      fontFamily: "Satoshi, sans-serif",
      type: "bar",
      height: 335,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    responsive: [
      {
        breakpoint: 1536,
        options: {
          plotOptions: {
            bar: {
              borderRadius: 0,
              columnWidth: "80%",
            },
          },
        },
      },
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 2,
        columnWidth: "80%",
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: "category",
      categories: "aoeu",
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
        rotate: -45,
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
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Satoshi",
      fontWeight: 500,
      fontSize: "14px",
    },
    fill: {
      opacity: 1,
    },
  };

  const handleReset = () => {
    setState((prevState: ChartTwoState) => ({
      ...prevState,
    }));
  };
  handleReset;

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white p-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <div className="mb-4 justify-between gap-4 sm:flex">
        <div>
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Aspectos
          </h4>
          <p className="text-sm font-medium">Calificación por aspecto</p>
        </div>
      </div>

      <div>
        <div id="chartTwo" className="-ml-5 -mb-9">
          <ReactApexChart
            options={options}
            series={state.series}
            type="bar"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartTwo;
