# from .models import Schedule, LaborCost, Agent, Chantier

# def recalculate_labor_costs_for_period(week=None, year=None, agent_id=None, chantier_id=None):
#     schedules = Schedule.objects.all()
#     if week:
#         schedules = schedules.filter(week=week)
#     if year:
#         schedules = schedules.filter(year=year)
#     if agent_id:
#         schedules = schedules.filter(agent_id=agent_id)
#     if chantier_id:
#         schedules = schedules.filter(chantier_id=chantier_id)

#     data = {}
#     for s in schedules:
#         key = (s.agent_id, s.chantier_id, s.week, s.year)
#         data.setdefault(key, 0)
#         data[key] += 1

#     for (agent_id, chantier_id, week, year), hours in data.items():
#         agent = Agent.objects.get(id=agent_id)
#         chantier = Chantier.objects.get(id=chantier_id)
#         cost = hours * (agent.taux_Horaire or 0)
#         LaborCost.objects.update_or_create(
#             agent=agent, chantier=chantier, week=week, year=year,
#             defaults={'hours': hours, 'cost': cost}
#         )
