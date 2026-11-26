// Startpagina per rol
export const homeFor = (role) => (role === 'Client' ? '/portal' : role === 'Manager' ? '/management' : role === 'AccountManager' ? '/cases' : '/alerts')
