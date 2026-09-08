/** FastAPI route map. */
export const ENDPOINTS = {
    auth: { signup: '/auth/signup', login: '/auth/login', adminSignup: '/admin/auth/signup', adminLogin: '/admin/auth/login' },
    tickets: {
        create: '/tickets', mine: '/tickets/user', byId: (id) => `/tickets/${id}`,
        status: (id) => `/tickets/status/${id}`, approval: (id) => `/tickets/${id}/approval`,
        reward: (id) => `/tickets/${id}/ticket_reward`
    },
    adminTickets: {
        list: '/admin/tickets', pending: '/admin/tickets?pending=true', analytics: '/admin/tickets?analytics=true', processed: '/admin/tickets?processed=true', latestAlert: '/admin/tickets/alerts/latest',
        analyzeIncidents: '/admin/tickets/analyze_incidents',
        resolve: (id) => `/admin/tickets/${id}/resolve`, retry: (id) => `/admin/tickets/${id}/retry`, approval: (id) => `/admin/tickets/${id}/approval`, delete: (id) => `/admin/tickets/${id}`, engineerResolution: (id) => `/admin/tickets/${id}/engineer-resolution`, forUser: (id) => `/admin/tickets/user/${id}`, byId: (id) => `/admin/tickets/detail/${id}`,
    },
    users: { list: '/users', profile: '/users/profile', byId: (id) => `/users/${id}` },
    internalAdmin: { list: '/internal_admin', forUser: (id) => `/internal_admin/user_tickets/${id}`, byId: (id) => `/internal_admin/${id}` },
    model: { health: '/model/health', metrics: '/model/metrics' },
};
