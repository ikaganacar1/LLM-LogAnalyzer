import React, { useState, useEffect } from 'react';
import { Moon, Sun, Save } from 'lucide-react';
import { Button } from './ui/button';

interface SettingsProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  logContextSize: number;
  onLogContextSizeChange: (size: number) => void;
  logGenerationInterval: number;
  onLogGenerationIntervalChange: (interval: number) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isDarkMode,
  onToggleDarkMode,
  logContextSize,
  onLogContextSizeChange,
  logGenerationInterval,
  onLogGenerationIntervalChange
}) => {
  const [localLogContextSize, setLocalLogContextSize] = useState(logContextSize);
  const [localLogInterval, setLocalLogInterval] = useState(logGenerationInterval);
  const [apiUrl, setApiUrl] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load API URL and model from localStorage
    const storedApiUrl = localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const storedModel = localStorage.getItem('selected_model') || '';
    setApiUrl(storedApiUrl);
    setSelectedModel(storedModel);

    // Fetch available models
    fetchModels(storedApiUrl);
  }, []);

  const fetchModels = async (baseUrl: string) => {
    setLoadingModels(true);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        // Get the current model from health endpoint
        if (data.model) {
          setAvailableModels([data.model]);
          if (!selectedModel) {
            setSelectedModel(data.model);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = () => {
    onLogContextSizeChange(localLogContextSize);
    onLogGenerationIntervalChange(localLogInterval);
    localStorage.setItem('api_url', apiUrl);
    localStorage.setItem('selected_model', selectedModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground">
          Made by <span className="font-semibold text-primary">ika</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Appearance</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground mt-1">
                Switch between light and dark mode
              </p>
            </div>

            <Button
              onClick={onToggleDarkMode}
              variant="outline"
              size="default"
              className="gap-2"
            >
              {isDarkMode ? (
                <>
                  <Sun size={16} />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon size={16} />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </div>

        {/* LLM Configuration */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">LLM Configuration</h3>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-foreground mb-2">
                Log Context Size
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Number of recent log messages to send to LLM for analysis
              </p>
              <input
                type="number"
                min="5"
                max="50"
                value={localLogContextSize}
                onChange={(e) => setLocalLogContextSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-2">
                API Base URL
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Backend API endpoint (requires page reload)
              </p>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  fetchModels(e.target.value);
                }}
                placeholder="http://ollama.ikaganacar.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-2">
                LLM Model
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Select the language model for analysis
              </p>
              {loadingModels ? (
                <div className="text-sm text-muted-foreground italic">Loading models...</div>
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select model...</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Log Generator Configuration */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Log Generator</h3>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-foreground mb-2">
                Generation Interval (ms)
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Time between generated log entries
              </p>
              <input
                type="number"
                min="100"
                max="5000"
                step="100"
                value={localLogInterval}
                onChange={(e) => setLocalLogInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* System Info Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Information</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-foreground">1.0.0-POC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project</span>
              <span className="font-mono text-foreground">AI Log Analyzer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LLM Provider</span>
              <span className="font-mono text-foreground">Ollama</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Model</span>
              <span className="font-mono text-foreground text-xs">
                {selectedModel || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Author</span>
              <span className="font-mono text-foreground">ika</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            variant="default"
            size="default"
            className="gap-2"
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};
