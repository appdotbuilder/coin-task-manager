import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { 
  Plus, 
  Link as LinkIcon, 
  Coins, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  Info,
  DollarSign
} from 'lucide-react';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  currentBalance: number;
}

export function CreateTaskDialog({ isOpen, onClose, onTaskCreated, currentBalance }: CreateTaskDialogProps) {
  const [link, setLink] = useState('');
  const [coinReward, setCoinReward] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    link?: string;
    coinReward?: string;
  }>({});

  // Validation functions
  const validateLink = (url: string) => {
    if (!url) return 'Link is required';
    try {
      new URL(url);
      return '';
    } catch {
      return 'Please enter a valid URL (include http:// or https://)';
    }
  };

  const validateCoinReward = (reward: string, balance: number) => {
    const numReward = parseFloat(reward);
    if (!reward) return 'Coin reward is required';
    if (isNaN(numReward)) return 'Coin reward must be a number';
    if (numReward <= 0) return 'Coin reward must be greater than 0';
    if (numReward > balance) return `Insufficient balance. You have ${balance} coins available`;
    if (numReward > 1000) return 'Maximum reward is 1000 coins per task';
    return '';
  };

  // Real-time validation
  const handleLinkChange = (value: string) => {
    setLink(value);
    const error = validateLink(value);
    setValidationErrors(prev => ({ ...prev, link: error }));
  };

  const handleCoinRewardChange = (value: string) => {
    setCoinReward(value);
    const error = validateCoinReward(value, currentBalance);
    setValidationErrors(prev => ({ ...prev, coinReward: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation
    const linkError = validateLink(link);
    const rewardError = validateCoinReward(coinReward, currentBalance);

    if (linkError || rewardError) {
      setValidationErrors({
        link: linkError,
        coinReward: rewardError
      });
      return;
    }

    setIsLoading(true);

    try {
      await trpc.createTask.mutate({
        link,
        coin_reward: parseFloat(coinReward)
      });

      // Reset form
      setLink('');
      setCoinReward('');
      setValidationErrors({});
      
      // Notify parent and close dialog
      onTaskCreated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to create task. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setLink('');
    setCoinReward('');
    setError('');
    setValidationErrors({});
    onClose();
  };

  const isFormValid = !validationErrors.link && !validationErrors.coinReward && 
                     link.length > 0 && coinReward.length > 0;
  
  const rewardValue = parseFloat(coinReward) || 0;
  const remainingBalance = currentBalance - rewardValue;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glassmorphism border-white/20 bg-white/5 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Plus className="w-5 h-5 mr-2 text-purple-400" />
            Create New Task
          </DialogTitle>
          <DialogDescription className="text-blue-200">
            Create a task for others to complete and earn coins
          </DialogDescription>
        </DialogHeader>

        {/* Balance Info */}
        <div className="glassmorphism rounded-lg p-4 bg-blue-500/10 border-blue-500/20 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-200 text-sm">Current Balance</span>
            <div className="flex items-center">
              <Coins className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="font-bold text-white">{currentBalance}</span>
            </div>
          </div>
          {rewardValue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-300">After this task</span>
              <div className="flex items-center">
                <Coins className="w-3 h-3 text-yellow-400 mr-1" />
                <span className={`font-medium ${remainingBalance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {remainingBalance}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert className="mb-4 bg-red-500/10 border-red-500/20">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link Field */}
          <div className="space-y-2">
            <Label htmlFor="link" className="text-white font-medium flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              Task Link
            </Label>
            <Input
              id="link"
              type="url"
              value={link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLinkChange(e.target.value)}
              className={`glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow ${
                validationErrors.link ? 'border-red-400 focus:border-red-400' : 
                link.length > 0 && !validationErrors.link ? 'border-green-400' : ''
              }`}
              placeholder="https://example.com/task-to-complete"
              required
              disabled={isLoading}
            />
            {validationErrors.link && (
              <p className="text-red-300 text-sm flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {validationErrors.link}
              </p>
            )}
            {link.length > 0 && !validationErrors.link && (
              <p className="text-green-300 text-sm flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid URL
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 hover:text-green-200"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            )}
            <div className="glassmorphism rounded-lg p-3 bg-blue-500/5 border-blue-500/10">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                  Paste the link to the task you want others to complete. This could be a website to visit, 
                  a form to fill out, or any other online task.
                </p>
              </div>
            </div>
          </div>

          {/* Coin Reward Field */}
          <div className="space-y-2">
            <Label htmlFor="coinReward" className="text-white font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Coin Reward
            </Label>
            <Input
              id="coinReward"
              type="number"
              value={coinReward}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCoinRewardChange(e.target.value)}
              className={`glassmorphism border-white/20 bg-white/5 text-white placeholder:text-gray-300 input-glow ${
                validationErrors.coinReward ? 'border-red-400 focus:border-red-400' : 
                coinReward.length > 0 && !validationErrors.coinReward ? 'border-green-400' : ''
              }`}
              placeholder="Enter reward amount"
              min="0.01"
              max="1000"
              step="0.01"
              required
              disabled={isLoading}
            />
            {validationErrors.coinReward && (
              <p className="text-red-300 text-sm flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {validationErrors.coinReward}
              </p>
            )}
            {coinReward.length > 0 && !validationErrors.coinReward && rewardValue <= currentBalance && (
              <p className="text-green-300 text-sm flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid reward amount
              </p>
            )}
            
            {/* Reward Suggestions */}
            <div className="flex gap-2 flex-wrap">
              {[1, 5, 10, 25, 50].filter(amount => amount <= currentBalance).map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCoinRewardChange(amount.toString())}
                  className="glass-button text-xs px-2 py-1 h-auto"
                  disabled={isLoading}
                >
                  {amount} coins
                </Button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 btn-secondary"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || !isFormValid || rewardValue > currentBalance}
              className="flex-1 btn-primary"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Task Creation Tips */}
        <div className="glassmorphism rounded-lg p-3 bg-purple-500/5 border-purple-500/10 mt-4">
          <h4 className="text-purple-300 font-medium mb-2 flex items-center">
            <Info className="w-4 h-4 mr-1" />
            Tips for Better Tasks
          </h4>
          <ul className="text-xs text-purple-200 space-y-1">
            <li>• Make sure the link is accessible and working</li>
            <li>• Higher rewards attract more participants</li>
            <li>• Clear and simple tasks get completed faster</li>
            <li>• Consider the time and effort required</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}