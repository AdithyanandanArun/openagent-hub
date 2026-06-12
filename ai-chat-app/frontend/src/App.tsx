import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.token || !auth.user) {
    return <LoginPage onLogin={auth.login} onRegister={auth.register} />;
  }

  return <ChatPage token={auth.token} user={auth.user} onLogout={auth.logout} />;
}
