import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/App';
import { LogIn, User, Lock, Coins, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="glassmorphism rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-glow">
            <Coins className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">TaskCoin</h1>
          <p className="text-blue-200">Earn coins by completing tasks</p>
        </div>

        {/* Login Form */}
        <div className="glassmorphism rounded-2xl p-8 animate-float">
          <div className="flex items-center justify-center mb-6">
            <LogIn className="w-6 h-6 text-purple-400 mr-2" />
            <h2 className="text-2xl font-semibold text-white">Welcome Back</h2>
          </div>

          {error && (
            <Alert className="mb-6 bg-red-500/10 border-red-500/20 animate-pulse">
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white font-medium flex items-center">
                <User className="w-4 h-4 mr-2" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow"
                placeholder="Enter your username"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary text-white font-semibold py-3 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Switch to Register */}
          <div className="mt-8 text-center">
            <p className="text-blue-200 mb-4">Don't have an account?</p>
            <Button
              type="button"
              variant="outline"
              onClick={onSwitchToRegister}
              className="btn-secondary text-white border-white/20 hover:border-white/40"
            >
              Create Account
            </Button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="glassmorphism rounded-xl p-4">
            <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-blue-200">Earn Coins</p>
          </div>
          <div className="glassmorphism rounded-xl p-4">
            <User className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-blue-200">Create Tasks</p>
          </div>
          <div className="glassmorphism rounded-xl p-4">
            <ArrowRight className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-blue-200">Complete & Win</p>
          </div>
        </div>
      </div>
    </div>
  );
}