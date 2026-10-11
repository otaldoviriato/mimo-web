const getToken = async () => 'isolated-test-token';
const signOut = async () => {};
export function useAuth() { return { isLoaded: true, isSignedIn: true, userId: 'fixture', getToken, signOut }; }
