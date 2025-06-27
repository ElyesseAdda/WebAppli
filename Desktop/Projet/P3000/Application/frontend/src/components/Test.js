import { Box } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import React from "react";

export default function TestPie() {
  return (
    <Box sx={{ height: 300, width: 400 }}>
      <ResponsivePie
        data={[
          { id: "A", label: "A", value: 10 },
          { id: "B", label: "B", value: 20 },
        ]}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ scheme: "nivo" }}
        borderWidth={1}
        borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
      />
    </Box>
  );
}
