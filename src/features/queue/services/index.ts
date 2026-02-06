/**
 * COOPNAMA Sistema de Turnos
 * Queue Services - Barrel Export
 */

// Ticket operations
export {
  createTicket,
  getActiveQueue,
  getActiveQueueRPC,
  callNextTicket,
  startServingTicket,
  completeTicket,
  markTicketNoShow,
  cancelTicket,
  updateTicketStatus,
  getTicketById,
  getCurrentTicketByStation,
  getCompletedTicketsToday,
  getDailyStats,
  getWaitingCountByService,
  formatTicketForUI,
} from './ticket-service'

// Realtime subscriptions
export {
  subscribeToTickets,
  subscribeToCalledTickets,
  subscribeToActiveTickets,
  subscribeToAgentSessions,
  unsubscribe,
  unsubscribeAll,
  createSubscription,
} from './realtime-service'

// Branch, Service, Station operations
export {
  getBranches,
  getBranchById,
  getDefaultBranch,
  getServices,
  getBranchServices,
  getServicesForKiosk,
  getServiceById,
  getServiceByCode,
  getStations,
  getStationsWithAgents,
  getStationById,
  startAgentSession,
  endAgentSession,
  getActiveAgentSession,
} from './branch-service'
