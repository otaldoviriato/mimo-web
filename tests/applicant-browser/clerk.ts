const getToken = async () => 'isolated-test-token';
const signOut = async () => {};
export function useAuth() { return { isLoaded: true, isSignedIn: true, userId: 'fixture', getToken, signOut }; }
export function useSignIn() { return { isLoaded: true, signIn: {}, setActive: async () => {} }; }
export function useSignUp() { return { isLoaded: true, signUp: {}, setActive: async () => {} }; }
