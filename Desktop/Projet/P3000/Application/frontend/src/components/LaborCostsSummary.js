import axios from "axios";
import React, { useEffect, useState } from "react";

const LaborCostsSummary = ({ week, year, agentId }) => {
  const [costs, setCosts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCosts = async () => {
      if (!week || !year) return;

      setIsLoading(true);
      try {
        const params = {
          week,
          year,
          ...(agentId && { agent_id: agentId }),
        };

        const response = await axios.get("/api/get_labor_costs/", { params });
        setCosts(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des coûts:", error);
        setError("Erreur lors de la récupération des coûts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCosts();
  }, [week, year, agentId]);

  if (isLoading) return <div>Chargement des coûts...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div className="labor-costs-summary">
      <h3>Résumé des Coûts de Main d'Œuvre</h3>
      {Object.entries(costs).map(([chantierName, data]) => (
        <div key={chantierName} className="chantier-costs">
          <h4>{chantierName}</h4>
          <p>Total heures: {data.total_hours}h</p>
          <p>Coût total: {data.total_cost.toFixed(2)}€</p>

          <div className="details">
            <h5>Détails par agent:</h5>
            {data.details.map((detail, index) => (
              <div key={index} className="agent-detail">
                <p>
                  {detail.agent_name}: {detail.hours}h -{" "}
                  {detail.cost.toFixed(2)}€
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style jsx>{`
        .labor-costs-summary {
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-top: 20px;
        }

        .chantier-costs {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .details {
          margin-top: 10px;
          padding-left: 15px;
          border-left: 3px solid #e0e0e0;
        }

        .agent-detail {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default LaborCostsSummary;
