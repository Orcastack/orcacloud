/**
 * TerminalPanel
 * =============
 * Browser-based interactive terminal powered by xterm.js and Django Channels
 * WebSocket. Connects to /ws/workspace/<id>/terminal/ and streams shell I/O.
 *
 * Props:
 *   wsUrl     – full WebSocket URL built by buildTerminalWsUrl()
 *   isOpen    – whether the panel is visible (mount/unmount handled by parent)
 *   onClose   – callback to close/hide the panel
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface TerminalPanelProps {
  wsUrl: string
  isOpen: boolean
  onClose: () => void
}

const STATUS_COLORS: Record<ConnectionStatus, 'default' | 'primary' | 'success' | 'error'> = {
  connecting:   'primary',
  connected:    'success',
  disconnected: 'default',
  error:        'error',
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ wsUrl, isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef     = useRef<XTerm | null>(null)
  const fitAddonRef  = useRef<FitAddon | null>(null)
  const wsRef        = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [fullscreen, setFullscreen] = useState(false)

  // ── Mount / unmount terminal ───────────────────────────────────────────────

  const initTerminal = useCallback(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor:     '#58a6ff',
        selectionBackground: '#264f78',
        black:   '#484f58',
        red:     '#ff7b72',
        green:   '#3fb950',
        yellow:  '#d29922',
        blue:    '#58a6ff',
        magenta: '#bc8cff',
        cyan:    '#39c5cf',
        white:   '#b1bac4',
      },
      scrollback: 5000,
    })

    const fitAddon      = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    term.open(containerRef.current)
    fitAddon.fit()
    term.write('\x1b[1;36mConnecting to workspace terminal…\x1b[0m\r\n')

    xtermRef.current   = term
    fitAddonRef.current = fitAddon

    return { term, fitAddon }
  }, [])

  const connectWs = useCallback(
    (term: XTerm, fitAddon: FitAddon) => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      setStatus('connecting')

      ws.onopen = () => {
        setStatus('connected')
        // Send initial size
        const { cols, rows } = term
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string)
          if (msg.type === 'output') {
            term.write(msg.data)
          } else if (msg.type === 'error') {
            term.write(`\x1b[1;31m[Error] ${msg.message}\x1b[0m\r\n`)
          }
        } catch {
          term.write(ev.data)
        }
      }

      ws.onerror = () => {
        setStatus('error')
        term.write('\r\n\x1b[1;31m[WebSocket error — check console]\x1b[0m\r\n')
      }

      ws.onclose = (ev) => {
        setStatus('disconnected')
        if (ev.code !== 1000) {
          term.write(`\r\n\x1b[33m[Disconnected — code ${ev.code}]\x1b[0m\r\n`)
        }
      }

      // Forward keystrokes
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }))
        }
      })

      // Forward resize
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      })
    },
    [wsUrl],
  )

  useEffect(() => {
    if (!isOpen) return

    const result = initTerminal()
    if (!result) return

    connectWs(result.term, result.fitAddon)

    let resizeTimeout: number
    const ro = new ResizeObserver(() => {
      // Debounce resize events to prevent loops
      cancelAnimationFrame(resizeTimeout)
      resizeTimeout = requestAnimationFrame(() => {
        if (result.fitAddon) {
          result.fitAddon.fit()
        }
      })
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(resizeTimeout)
      ro.disconnect()
      wsRef.current?.close(1000)
      xtermRef.current?.dispose()
      wsRef.current  = null
      xtermRef.current = null
    }
  }, [isOpen, initTerminal, connectWs])

  // ── Reconnect ──────────────────────────────────────────────────────────────

  const handleReconnect = () => {
    wsRef.current?.close(1000)
    xtermRef.current?.dispose()
    wsRef.current  = null
    xtermRef.current = null
    if (containerRef.current) containerRef.current.innerHTML = ''
    const result = initTerminal()
    if (result) connectWs(result.term, result.fitAddon)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <Box
      sx={{
        display:       'flex',
        flexDirection: 'column',
        position:      fullscreen ? 'fixed' : 'relative',
        top:           fullscreen ? 0 : undefined,
        left:          fullscreen ? 0 : undefined,
        right:         fullscreen ? 0 : undefined,
        bottom:        fullscreen ? 0 : undefined,
        zIndex:        fullscreen ? 1400 : undefined,
        width:         fullscreen ? '100vw' : '100%',
        height:        fullscreen ? '100vh' : 420,
        bgcolor:       '#0d1117',
        border:        '1px solid',
        borderColor:   'divider',
        borderRadius:  fullscreen ? 0 : 1,
        overflow:      'hidden',
      }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display:        'flex',
          alignItems:     'center',
          gap:            1,
          px:             2,
          py:             0.5,
          bgcolor:        '#161b22',
          borderBottom:   '1px solid',
          borderColor:    'divider',
          flexShrink:     0,
        }}
      >
        <Typography variant="caption" sx={{ color: '#8b949e', flexGrow: 1, fontFamily: 'monospace' }}>
          bash — workspace terminal
        </Typography>

        <Chip
          label={status}
          size="small"
          color={STATUS_COLORS[status]}
          sx={{ fontSize: 10, height: 18 }}
        />

        <Tooltip title="Reconnect">
          <span>
            <IconButton size="small" onClick={handleReconnect} disabled={status === 'connecting'} sx={{ color: '#8b949e' }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: '#8b949e' }}>
            {fullscreen
              ? <FullscreenExitIcon sx={{ fontSize: 16 }} />
              : <FullscreenIcon    sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Close terminal">
          <IconButton size="small" onClick={onClose} sx={{ color: '#8b949e' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── xterm container ───────────────────────────────────────────────── */}
      <Box
        ref={containerRef}
        sx={{ flex: 1, overflow: 'hidden', p: 0 }}
      />
    </Box>
  )
}

export default TerminalPanel
