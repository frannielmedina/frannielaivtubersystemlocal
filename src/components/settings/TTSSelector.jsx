import React, { useState, useEffect } from 'react';
import './TTSSelector.css';

const TTSSelector = ({ ttsService }) => {
  const [provider, setProvider] = useState('browser');
  const [config, setConfig] = useState({
    elevenlabs: { apiKey: '', voiceId: '' },
    coquiRemote: { apiUrl: '', voiceId: '' },
    coquiLocal: { serverUrl: 'http://localhost:5002' }
  });
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    if (ttsService) {
      setProvider(ttsService.getProvider());
      setEnabled(ttsService.isEnabled());
      setConfig(ttsService.config);
      setVolume(ttsService.volume * 100);
    }
  }, [ttsService]);

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (ttsService) {
      ttsService.updateConfig({
        provider: newProvider,
        config: config
      });
    }
  };

  const handleConfigChange = (providerName, key, value) => {
    const newConfig = {
      ...config,
      [providerName]: {
        ...config[providerName],
        [key]: value
      }
    };
    setConfig(newConfig);
    
    if (ttsService) {
      ttsService.updateConfig({
        provider: provider,
        config: newConfig
      });
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    if (ttsService) {
      ttsService.setVolume(vol / 100);
    }
  };

  const handleToggle = () => {
    if (ttsService) {
      const newState = ttsService.toggle();
      setEnabled(newState);
    }
  };

  const handleTest = async () => {
    if (testing || !ttsService) return;
    
    setTesting(true);
    try {
      await ttsService.test();
    } catch (error) {
      console.error('Test TTS failed:', error);
      alert('Error probando TTS: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const providers = [
    { id: 'browser', name: 'Navegador (Web Speech)', icon: '🌐' },
    { id: 'elevenlabs', name: 'ElevenLabs', icon: '🎙️' },
    { id: 'coqui-remote', name: 'Coqui TTS Remoto', icon: '☁️' },
    { id: 'coqui-local', name: 'Coqui TTS Local', icon: '💻' }
  ];

  return (
    <div className="tts-selector">
      <div className="tts-header">
        <h3>🔊 Configuración de Voz</h3>
        <button 
          className={`toggle-btn ${enabled ? 'enabled' : 'disabled'}`}
          onClick={handleToggle}
        >
          {enabled ? '🔊 Activado' : '🔇 Desactivado'}
        </button>
      </div>

      {/* Volume Control */}
      <div className="volume-control">
        <label>
          <span>Volumen: {volume}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            disabled={!enabled}
          />
        </label>
      </div>

      {/* Provider Selection */}
      <div className="provider-select">
        <label>Proveedor de TTS:</label>
        <div className="provider-grid">
          {providers.map(p => (
            <button
              key={p.id}
              className={`provider-btn ${provider === p.id ? 'active' : ''}`}
              onClick={() => handleProviderChange(p.id)}
              disabled={!enabled}
            >
              <span className="provider-icon">{p.icon}</span>
              <span className="provider-name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Panels */}
      {enabled && (
        <>
          {/* ElevenLabs Config */}
          {provider === 'elevenlabs' && (
            <div className="config-panel">
              <h4>⚙️ Configuración ElevenLabs</h4>
              <div className="form-group">
                <label>API Key:</label>
                <input
                  type="password"
                  placeholder="sk_..."
                  value={config.elevenlabs.apiKey}
                  onChange={(e) => handleConfigChange('elevenlabs', 'apiKey', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Voice ID:</label>
                <input
                  type="text"
                  placeholder="21m00Tcm4TlvDq8ikWAM"
                  value={config.elevenlabs.voiceId}
                  onChange={(e) => handleConfigChange('elevenlabs', 'voiceId', e.target.value)}
                />
              </div>
              <small className="help-text">
                Obtén tu API key y Voice ID en: <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">elevenlabs.io</a>
              </small>
            </div>
          )}

          {/* Coqui Remote Config */}
          {provider === 'coqui-remote' && (
            <div className="config-panel">
              <h4>⚙️ Configuración Coqui TTS Remoto</h4>
              <div className="form-group">
                <label>API URL:</label>
                <input
                  type="text"
                  placeholder="https://api.example.com"
                  value={config.coquiRemote.apiUrl}
                  onChange={(e) => handleConfigChange('coquiRemote', 'apiUrl', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Voice ID (opcional):</label>
                <input
                  type="text"
                  placeholder="voice_id"
                  value={config.coquiRemote.voiceId}
                  onChange={(e) => handleConfigChange('coquiRemote', 'voiceId', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Coqui Local Config */}
          {provider === 'coqui-local' && (
            <div className="config-panel">
              <h4>⚙️ Configuración Coqui TTS Local</h4>
              <div className="form-group">
                <label>Server URL:</label>
                <input
                  type="text"
                  placeholder="http://localhost:5002"
                  value={config.coquiLocal.serverUrl}
                  onChange={(e) => handleConfigChange('coquiLocal', 'serverUrl', e.target.value)}
                />
              </div>
              <small className="help-text">
                Asegúrate de que el servidor Coqui TTS esté corriendo localmente.
              </small>
            </div>
          )}

          {/* Browser TTS Info */}
          {provider === 'browser' && (
            <div className="config-panel">
              <h4>ℹ️ TTS del Navegador</h4>
              <p>
                Utiliza la síntesis de voz integrada en tu navegador (Web Speech API).
              </p>
              <p>
                <strong>Ventajas:</strong> No requiere configuración, funciona sin internet.
              </p>
              <p>
                <strong>Desventajas:</strong> Calidad de voz variable según el navegador.
              </p>
            </div>
          )}
        </>
      )}

      {/* Test Button */}
      <button 
        className="test-btn"
        onClick={handleTest}
        disabled={!enabled || testing}
      >
        {testing ? '⏳ Probando...' : '🔊 Probar Voz'}
      </button>

      {/* Status */}
      <div className="tts-status">
        <small>
          Estado: {enabled ? '✅ Activo' : '❌ Desactivado'} | 
          Proveedor: {providers.find(p => p.id === provider)?.name || 'N/A'}
        </small>
      </div>
    </div>
  );
};

export default TTSSelector;
