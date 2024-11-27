import React from "react";

const PlanningTable = ({
  schedule,
  hours,
  daysOfWeek,
  selectedCells,
  handleMouseDown,
  handleMouseEnter,
  handleMouseUp,
}) => {
  return (
    <table border="1">
      <thead>
        <tr>
          <th>Heures</th>
          {daysOfWeek.map((day, index) => (
            <th key={index}>
              {day}
              <br />
              {/* Afficher les dates correspondantes */}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour}>
            <td>{hour}</td>
            {daysOfWeek.map((day) => (
              <td
                key={`${hour}-${day}`}
                onMouseDown={() => handleMouseDown(hour, day)}
                onMouseEnter={() => handleMouseEnter(hour, day)}
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedCells.some(
                    (cell) => cell.hour === hour && cell.day === day
                  )
                    ? "lightblue"
                    : schedule[hour][day]
                    ? "lightgreen"
                    : "white",
                }}
              >
                {schedule[hour][day]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PlanningTable;
