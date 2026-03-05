(() => {
  const el = {
    enableNotify: document.getElementById('enableNotify'),
    notifyProvider: document.getElementById('notifyProvider'),
    enableTTS: document.getElementById('enableTTS'),
    ttsEngine: document.getElementById('ttsEngine'),
    ttsVoice: document.getElementById('ttsVoice'),
    ttsPitch: document.getElementById('ttsPitch'),
    ttsRate: document.getElementById('ttsRate'),
    ttsEndpoint: document.getElementById('ttsEndpoint'),
    ttsEdgeVoice: document.getElementById('ttsEdgeVoice'),
    ttsVolume: document.getElementById('ttsVolume'),
    systemSoundVolume: document.getElementById('systemSoundVolume'),
    btnTestOverlayText: document.getElementById('btnTestOverlayText'),
    // Sound inputs
    soundIn: document.getElementById('soundIn'),
    soundOut: document.getElementById('soundOut'),
    soundMessage: document.getElementById('soundMessage'),
    soundAlarm: document.getElementById('soundAlarm')
  };

  // Theme Management
  const applyTheme = (mode, color) => {
    const root = document.documentElement;
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const adjustBrightness = (hex, percent) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };
    const accent = color || '#238f4a';
    root.style.setProperty('--accent', accent);
    const hex = accent.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    if (isDark) {
      root.style.setProperty('--bg', '#121621');
      root.style.setProperty('--fg', '#ededed');
      root.style.setProperty('--muted', '#94a3b8');
      root.style.setProperty('--panel', 'rgba(255, 255, 255, 0.04)');
      root.style.setProperty('--item-bg', 'rgba(255, 255, 255, 0.04)');
      root.style.setProperty('--border', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--bg-modal', '#1b1f2a');
      root.style.setProperty('--fg-title', '#e5e7eb');
      root.style.setProperty('--btn-secondary-bg', 'rgba(255, 255, 255, 0.06)');
      const darkAccent = adjustBrightness(accent, -40);
      root.style.setProperty('--bg-gradient-start', darkAccent);
    } else {
      root.style.setProperty('--bg', '#f3f4f6');
      root.style.setProperty('--fg', '#1f2937');
      root.style.setProperty('--muted', '#6b7280');
      root.style.setProperty('--panel', '#ffffff');
      root.style.setProperty('--item-bg', '#f3f4f6');
      root.style.setProperty('--border', '#e5e7eb');
      root.style.setProperty('--bg-modal', '#ffffff');
      root.style.setProperty('--fg-title', '#111827');
      root.style.setProperty('--btn-secondary-bg', 'rgba(0, 0, 0, 0.05)');
      const lightAccent = adjustBrightness(accent, 60);
      root.style.setProperty('--bg-gradient-start', lightAccent);
    }
  };

  const initTheme = async () => {
    try {
      const cfg = await window.settingsAPI?.configGetAll('system');
      const mode = cfg?.themeMode || 'system';
      const color = cfg?.themeColor || '#238f4a';
      applyTheme(mode, color);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (mode === 'system') applyTheme('system', color);
      });
      window.settingsAPI?.onConfigChanged((payload) => {
        if (payload?.scope === 'system') {
           if (payload.key === 'themeMode') applyTheme(payload.value, color);
           if (payload.key === 'themeColor') applyTheme(mode, payload.value);
           // Re-fetch to be safe if multiple keys changed or complex logic
           (async () => {
             const newCfg = await window.settingsAPI?.configGetAll('system');
             applyTheme(newCfg?.themeMode || 'system', newCfg?.themeColor || '#238f4a');
           })();
        }
      });
    } catch (e) {}
  };
  initTheme();

  // 初始化：从统一配置存储读取
  (async () => {
    try {
      const cfg = await window.settingsAPI?.configPluginGetAll?.('notify-plugin');
      if (el.enableNotify) el.enableNotify.checked = (cfg?.enabled ?? true);
      
      // Init providers
      (async () => {
        try {
          if (el.notifyProvider) {
              // Fetch providers from backend
              const providers = await window.settingsAPI?.pluginCall?.('notify-plugin', 'getProviders', []);
              const current = cfg?.provider || 'builtin';
              updateProviderList(providers.result, current);
          }
        } catch(e) {}
      })();

      if (el.enableTTS) el.enableTTS.checked = !!cfg?.tts;
      if (el.ttsEngine) el.ttsEngine.value = (cfg?.ttsEngine ?? 'system');
      if (el.ttsPitch) el.ttsPitch.value = (cfg?.ttsPitch ?? 1);
      if (el.ttsRate) el.ttsRate.value = (cfg?.ttsRate ?? 1);
      if (el.ttsEndpoint) el.ttsEndpoint.value = (cfg?.ttsEndpoint ?? '');
      if (el.ttsEdgeVoice) el.ttsEdgeVoice.value = (cfg?.ttsEdgeVoice ?? '');
      if (el.ttsVolume) el.ttsVolume.value = Math.round((cfg?.ttsVolume ?? 100));
      if (el.systemSoundVolume) el.systemSoundVolume.value = Math.round((cfg?.systemSoundVolume ?? 80));
      
      if (el.soundIn) el.soundIn.value = cfg?.soundIn || '';
      if (el.soundOut) el.soundOut.value = cfg?.soundOut || '';
      if (el.soundMessage) el.soundMessage.value = cfg?.soundMessage || '';
      if (el.soundAlarm) el.soundAlarm.value = cfg?.soundAlarm || '';

      initVoices(cfg?.ttsVoiceURI);
      initEdgeVoices(cfg?.ttsEdgeVoice);
    } catch (e) {}
  })();

  // Provider list update helper
  const updateProviderList = (providers, current) => {
      if (!el.notifyProvider) return;
      el.notifyProvider.innerHTML = '';
      
      // Default builtin
      if (!providers || Object.keys(providers).length === 0) {
          const opt = document.createElement('option');
          opt.value = 'builtin';
          opt.textContent = '通知服务';
          el.notifyProvider.appendChild(opt);
      } else {
          Object.keys(providers).forEach(key => {
              const p = providers[key];
              const opt = document.createElement('option');
              opt.value = key;
              opt.textContent = p.name || key;
              el.notifyProvider.appendChild(opt);
          });
      }
      
      el.notifyProvider.value = current || 'builtin';
  };

  // Listen for provider updates
  if (window.settingsAPI && window.settingsAPI.ipcRenderer) {
      window.settingsAPI.ipcRenderer.on('notify:providers:update', (evt, providers) => {
          const current = el.notifyProvider ? el.notifyProvider.value : 'builtin';
          updateProviderList(providers, current);
      });
  }
  
  // Provider change handler
  if (el.notifyProvider) {
      el.notifyProvider.addEventListener('change', () => {
          const val = el.notifyProvider.value || 'builtin';
          (async () => {
            try {
              await window.settingsAPI?.configPluginSet?.('notify-plugin', 'provider', val);
              await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
            } catch (e) {}
          })();
      });
  }

  // 语音列表加载
  const initVoices = (currentURI) => {
    try {
      if (!el.ttsVoice || !window.speechSynthesis) return;
      const build = () => {
        const voices = window.speechSynthesis.getVoices();
        el.ttsVoice.innerHTML = '';
        // 添加一个“系统默认”占位（空值）
        const def = document.createElement('option');
        def.value = '';
        def.textContent = '系统默认';
        el.ttsVoice.appendChild(def);
        voices.forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.voiceURI || `${v.name}|${v.lang}`;
          opt.textContent = `${v.name} (${v.lang})${v.default ? ' · 默认' : ''}`;
          el.ttsVoice.appendChild(opt);
        });
        // 选中当前配置的 voiceURI
        if (currentURI) {
          el.ttsVoice.value = currentURI;
          if (el.ttsVoice.value !== currentURI) {
            // 兼容 name|lang 存储的旧值
            el.ttsVoice.value = '';
          }
        }
      };
      const existing = window.speechSynthesis.getVoices();
      if (existing && existing.length) {
        build();
      } else {
        window.speechSynthesis.onvoiceschanged = () => build();
      }
    } catch (e) {}
  };

  // Sound management: browse, restore, play
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const targetId = btn.dataset.target; // for input or sound type
      
      if (action === 'browse') {
        try {
          const res = await window.settingsAPI?.selectFile({
            title: '选择音频文件',
            filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'aac'] }]
          });
          if (res && !res.canceled && res.paths && res.paths.length > 0) {
            const path = res.paths[0];
            const input = document.getElementById(targetId);
            if (input) {
              input.value = path;
              // Save config
              await window.settingsAPI?.configPluginSet?.('notify-plugin', targetId, path);
              await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
            }
          }
        } catch (e) {}
      } else if (action === 'restore') {
        const input = document.getElementById(targetId);
        if (input) {
          input.value = '';
          // Save config as empty string (revert to default)
          await window.settingsAPI?.configPluginSet?.('notify-plugin', targetId, '');
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        }
      } else if (action === 'play') {
        try { 
          // targetId here is 'in', 'out', 'message', 'alarm'
          window.settingsAPI?.pluginCall?.('notify-plugin', 'playSound', [targetId]); 
        } catch (e) {}
      }
    });
  });

  // 测试纯文本提示（全屏）
  if (el.btnTestOverlayText) {
    el.btnTestOverlayText.addEventListener('click', () => {
      try {
        const payload = { mode: 'overlay.text', text: '这是一条纯文本提示', animate: 'fade', duration: 2500 };
        window.settingsAPI?.pluginCall?.('notify-plugin', 'enqueue', [payload]);
      } catch (e) {}
    });
  }

  if (el.enableNotify) {
    el.enableNotify.addEventListener('change', () => {
      const enabled = !!el.enableNotify.checked;
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'enabled', enabled);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    });
  }

  if (el.enableTTS) {
    el.enableTTS.addEventListener('change', () => {
      const enabled = !!el.enableTTS.checked;
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'tts', enabled);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    });
  }

  // 引擎选择（支持 system 与 edge.local）
  if (el.ttsEngine) {
    el.ttsEngine.addEventListener('change', () => {
      const val = el.ttsEngine.value || 'system';
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsEngine', val);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    });
  }

  const initEdgeVoices = (current) => {
    try {
      if (!el.ttsEdgeVoice) return;
      const voices = [
        'zh-CN-XiaoxiaoNeural',
        'zh-CN-XiaoyiNeural',
        'zh-CN-YunjianNeural',
        'zh-CN-YunxiNeural',
        'zh-CN-YunyangNeural',
        'zh-HK-HiuMaanNeural',
        'zh-HK-WanLungNeural',
        'zh-TW-HsiaoChenNeural',
        'zh-TW-HsiaoYuNeural',
        'en-US-AriaNeural',
        'en-US-GuyNeural'
      ];
      el.ttsEdgeVoice.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '默认';
      el.ttsEdgeVoice.appendChild(def);
      voices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        el.ttsEdgeVoice.appendChild(opt);
      });
      if (current != null) {
        el.ttsEdgeVoice.value = current;
        if (el.ttsEdgeVoice.value !== current) el.ttsEdgeVoice.value = '';
      }
    } catch (e) {}
  };

  // 音色设置：voice, pitch, rate
  if (el.ttsVoice) {
    el.ttsVoice.addEventListener('change', () => {
      const val = el.ttsVoice.value || '';
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsVoiceURI', val);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    });
  }

  if (el.ttsPitch) {
    const handler = () => {
      const v = Number(el.ttsPitch.value || 1);
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsPitch', v);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    };
    el.ttsPitch.addEventListener('change', handler);
    el.ttsPitch.addEventListener('input', handler);
  }

  if (el.ttsRate) {
    const handler = () => {
      const v = Number(el.ttsRate.value || 1);
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsRate', v);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    };
    el.ttsRate.addEventListener('change', handler);
    el.ttsRate.addEventListener('input', handler);
  }

  // 系统音量滑块：设置播放通知音效时的系统主音量（0–100）
  if (el.systemSoundVolume) {
    const handler = () => {
      const v = Math.max(0, Math.min(100, Number(el.systemSoundVolume.value || 80)));
      const norm = Math.round(v);
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'systemSoundVolume', norm);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    };
    el.systemSoundVolume.addEventListener('input', handler);
    el.systemSoundVolume.addEventListener('change', handler);
  }

  // 标题栏窗口控件绑定（复用主程序 settings preload 的 windowControl）
  try {
    document.querySelectorAll('.win-btn').forEach((b) => {
      b.addEventListener('click', () => window.settingsAPI?.windowControl(b.dataset.act));
    });
  } catch (e) {}
  if (el.ttsEdgeVoice) {
    const handler = () => {
      const val = (el.ttsEdgeVoice.value || '').trim();
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsEdgeVoice', val);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    };
    el.ttsEdgeVoice.addEventListener('change', handler);
  }

  if (el.ttsVolume) {
    const handler = () => {
      const v = Math.max(0, Math.min(100, Number(el.ttsVolume.value || 100)));
      const norm = Math.round(v);
      (async () => {
        try {
          await window.settingsAPI?.configPluginSet?.('notify-plugin', 'ttsVolume', norm);
          await window.settingsAPI?.pluginCall?.('notify-plugin', 'broadcastConfig', []);
        } catch (e) {}
      })();
    };
    el.ttsVolume.addEventListener('input', handler);
    el.ttsVolume.addEventListener('change', handler);
  }

  // Tab switching logic
  document.querySelectorAll('.sub-item').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all tabs
      document.querySelectorAll('.sub-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.hidden = true);

      // Add active to current
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      const panel = document.getElementById(`tab-${tabId}`);
      if (panel) panel.hidden = false;
    });
  });
})();
