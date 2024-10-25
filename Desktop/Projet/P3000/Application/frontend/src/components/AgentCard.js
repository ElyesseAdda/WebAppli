// AgentCard.js
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/system';

// Function to capitalize the first letter
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Function to format events for display
const formatEvents = (events) => {
  return events.map(event => {
    const date = new Date(event.start_date).toLocaleDateString('fr-FR');
    const status = event.status;
    return `${date} ${status}`;
  });
};

// Function to get color by status
const getColorByStatus = (status) => {
  const colorMap = {
    P: 'green',
    A: 'red',
    C: 'purple',
    M: 'orange',
  };
  return colorMap[status] || 'grey';
};

// Styled Card component
const StyledCard = styled(Card)({
  minWidth: 400,
  maxWidth: 600,
  margin: '0 auto',
  marginBottom: 20,
  marginTop: 100,
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  borderRadius: 8,
  overflow: 'hidden',
  padding: '16px',
  minHeight: 400, 
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'left',
});

const AgentCard = ({ agent, events }) => {
  console.log(agent); // Verify that the agent data is correct

  // Format the events for display
  const eventSummary = events ? formatEvents(events) : [];

  return (
    <StyledCard>
      <CardContent>
        <Typography variant="h5" component="div" align="left" sx={{ color: 'rgb(22, 94, 145)', fontWeight: 'bold', mb: 2 }}>
          {`${agent.name} ${agent.surname}`}
        </Typography>
        {agent.monthly_hours && agent.monthly_hours.length > 0 ? (
          agent.monthly_hours.map(monthlyHour => (
            <Typography key={monthlyHour.month} sx={{ mb: 1.5, color: 'rgb(22, 94, 145)', fontWeight: 'bold' }}>
              {`${capitalizeFirstLetter(new Date(monthlyHour.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))},
               ${monthlyHour.hours}H`}
            </Typography>
          ))
        ) : (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Pas d'heures mensuelles disponibles
          </Typography>
        )}
        <Typography sx={{ mt: 2, mb: 1 }} color="text.secondary">
          <strong>Résumé des événements:</strong>
        </Typography>
        <Box>
          {eventSummary.map((event, index) => (
            <Typography key={index} sx={{ mb: 0.5, color: getColorByStatus(event.split(' ')[1]), fontWeight: 'bold' }}>
              {event}
            </Typography>
          ))}
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default AgentCard;
