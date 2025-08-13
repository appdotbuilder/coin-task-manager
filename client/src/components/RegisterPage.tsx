import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/App';
import { UserPlus, User, Lock, CheckCircle, AlertCircle, ArrowLeft, Coins } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  const { register } = useAuth();

  // Validation functions
  const validateUsername = (username: string) => {
    if (username.length < 3) return 'Username must be at least 3 characters long';
    if (username.length > 50) return 'Username must not exceed 50 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (confirmPassword !== password) return 'Passwords do not match';
    return '';
  };

  // Real-time validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const error = validateUsername(value);
    setValidationErrors(prev => ({ ...prev, username: error }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const error = validatePassword(value);
    setValidationErrors(prev => ({ ...prev, password: error }));
    
    // Also revalidate confirm password if it's been entered
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword, value);
      setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    const error = validateConfirmPassword(value, password);
    setValidationErrors(prev => ({ ...prev, confirmPassword: error }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10) return { strength: 50, label: 'Fair', color: 'bg-yellow-500' };
    if (password.length < 15) return { strength: 75, label: 'Good', color: 'bg-blue-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

    if (usernameError || passwordError || confirmPasswordError) {
      setValidationErrors({
        username: usernameError,
        password: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    setIsLoading(true);

    try {
      await register(username, password, confirmPassword);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('username')) {
          setValidationErrors(prev => ({ ...prev, username: 'Username already exists' }));
        } else {
          setError(error.message);
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const isFormValid = !validationErrors.username && !validationErrors.password && !validationErrors.confirmPassword && 
                     username.length > 0 && password.length > 0 && confirmPassword.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="glassmorphism rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-glow">
            <Coins className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Join TaskCoin</h1>
          <p className="text-blue-200">Create your account and start earning</p>
        </div>

        {/* Registration Form */}
        <div className="glassmorphism rounded-2xl p-8 animate-float">
          <div className="flex items-center justify-center mb-6">
            <UserPlus className="w-6 h-6 text-purple-400 mr-2" />
            <h2 className="text-2xl font-semibold text-white">Create Account</h2>
          </div>

          {error && (
            <Alert className="mb-6 bg-red-500/10 border-red-500/20 animate-pulse">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white font-medium flex items-center">
                <User className="w-4 h-4 mr-2" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUsernameChange(e.target.value)}
                className={`glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow ${
                  validationErrors.username ? 'border-red-400 focus:border-red-400' : 
                  username.length > 0 && !validationErrors.username ? 'border-green-400' : ''
                }`}
                placeholder="Choose a username"
                required
                disabled={isLoading}
              />
              {validationErrors.username && (
                <p className="text-red-300 text-sm flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validationErrors.username}
                </p>
              )}
              {username.length > 0 && !validationErrors.username && (
                <p className="text-green-300 text-sm flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Username is available
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordChange(e.target.value)}
                className={`glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow ${
                  validationErrors.password ? 'border-red-400 focus:border-red-400' : ''
                }`}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
              />
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Password Strength</span>
                    <span className={`font-medium ${
                      passwordStrength.strength < 50 ? 'text-red-300' :
                      passwordStrength.strength < 75 ? 'text-yellow-300' :
                      'text-green-300'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {validationErrors.password && (
                <p className="text-red-300 text-sm flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white font-medium flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfirmPasswordChange(e.target.value)}
                className={`glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow ${
                  validationErrors.confirmPassword ? 'border-red-400 focus:border-red-400' : 
                  confirmPassword.length > 0 && !validationErrors.confirmPassword ? 'border-green-400' : ''
                }`}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-300 text-sm flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validationErrors.confirmPassword}
                </p>
              )}
              {confirmPassword.length > 0 && !validationErrors.confirmPassword && (
                <p className="text-green-300 text-sm flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full btn-primary text-white font-semibold py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          {/* Switch to Login */}
          <div className="mt-8 text-center">
            <p className="text-blue-200 mb-4">Already have an account?</p>
            <Button
              type="button"
              variant="outline"
              onClick={onSwitchToLogin}
              className="btn-secondary text-white border-white/20 hover:border-white/40"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        </div>

        {/* Welcome Benefits */}
        <div className="mt-8 glassmorphism rounded-xl p-6 text-center">
          <h3 className="text-white font-semibold mb-3">🎉 Welcome Bonus</h3>
          <p className="text-blue-200 text-sm mb-2">Get started with 100 coins when you join!</p>
          <div className="flex justify-center items-center">
            <Coins className="w-5 h-5 text-yellow-400 mr-2" />
            <span className="text-yellow-400 font-bold">100 Coins</span>
          </div>
        </div>
      </div>
    </div>
  );
}