'use client'

import { useState, useEffect, useCallback } from 'react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'RDV' | 'Relance' | 'Rappel' | 'Intervention'
  projectId?: string
  status?: string
  notes?: string
}

interface Props {
  artisanId: string
}

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'RDV':          { bg: 'var(--event-rdv-bg)',          text: 'var(--event-rdv-text)',          border: 'var(--event-rdv-border)' },
  'Relance':      { bg: 'var(--event-relance-bg)',      text: 'var(--event-relance-text)',      border: 'var(--event-relance-border)' },
  'Rappel':       { bg: 'var(--event-rappel-bg)',       text: 'var(--event-rappel-text)',       border: 'var(--event-rappel-border)' },
  'Intervention': { bg: 'var(--event-intervention-bg)', text: 'var(--event-intervention-text)', border: 'var(--event-intervention-border)' },
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8h → 20h

export default function Calendar({ artisanId }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '09:00',
    type: 'RDV',
    notes: '',
    projectId: '',
  })

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      if (data.success) setEvents(data.events)
    } catch (e) {
      console.error('Events fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && view === 'week') setView('month')
  }, [isMobile, view])

  // ── Navigation ────────────────────────────────────────────────────────────
  const prev = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  const next = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  // ── Month helpers ─────────────────────────────────────────────────────────
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    // Start from Monday
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const days: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }

  const getWeekDays = () => {
    const d = new Date(currentDate)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date
    })
  }

  const toLocalDateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const getEventsForDate = (date: Date) => {
    const dateStr = toLocalDateStr(date)
    return events.filter(e => e.date && toLocalDateStr(new Date(e.date)) === dateStr)
  }

  const formatDateStr = (date: Date) => toLocalDateStr(date)

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openNewEvent = (dateStr: string) => {
    setSelectedEvent(null)
    setForm({ title: '', date: dateStr, time: '09:00', type: 'RDV', notes: '', projectId: '' })
    setShowModal(true)
  }

  const openEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    const [date, time] = (event.date || '').split('T')
    setForm({
      title: event.title || '',
      date: date || '',
      time: time?.slice(0, 5) || '09:00',
      type: event.type || 'RDV',
      notes: event.notes || '',
      projectId: event.projectId || '',
    })
    setShowModal(true)
  }

  const saveEvent = async () => {
    const missing: string[] = []
    if (!form.title?.trim()) missing.push('le titre')
    if (!form.date) missing.push('la date')

    if (missing.length > 0) {
      alert(`Merci de renseigner ${missing.join(' et ')} avant d'enregistrer.`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title,
        date: `${form.date}T${form.time}:00`,
        type: form.type,
        notes: form.notes,
        projectId: form.projectId,
      }
      const res = selectedEvent
        ? await fetch(`/api/events/${selectedEvent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()
      if (!res.ok || !data.success) {
        console.error('[CALENDAR] Failed to save event:', data.error)
        alert('Erreur lors de la creation de l\'evenement : ' + (data.error || 'inconnue'))
        return
      }

      await fetchEvents()
      setShowModal(false)
    } catch (err) {
      console.error('[CALENDAR] Network error:', err)
      alert('Erreur reseau lors de la creation de l\'evenement')
    } finally {
      setSaving(false)
    }
  }

  const deleteEventById = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    await fetchEvents()
    setShowModal(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    container: {
      background: 'var(--bg)',
      minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
      color: 'var(--text-1)',
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      marginBottom: '16px',
      gap: '10px',
      flexWrap: 'wrap' as const,
    },
    navBtn: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      color: 'var(--text-1)',
      borderRadius: '8px',
      padding: isMobile ? '5px 9px' : '8px 14px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '14px',
    } as React.CSSProperties,
    viewBtn: (active: boolean) => ({
      background: active ? 'var(--accent)' : 'var(--bg-elevated)',
      border: '1px solid',
      borderColor: active ? 'var(--accent)' : 'var(--border)',
      color: active ? '#05130d' : 'var(--text-1)',
      borderRadius: '8px',
      padding: isMobile ? '7px 12px' : '8px 16px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: active ? 700 : 400,
    } as React.CSSProperties),
  }

  const title = view === 'month'
    ? `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const days = getWeekDays()
        return `${days[0].getDate()} — ${days[6].getDate()} ${MONTHS_FR[days[6].getMonth()]} ${days[6].getFullYear()}`
      })()

  return (
    <div style={s.container}>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ ...s.header, margin: 0, padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
            <button style={s.navBtn} onClick={prev}>‹</button>
            <h2 style={{ margin: 0, fontSize: isMobile ? '13px' : '18px', fontWeight: 600, minWidth: isMobile ? '0' : '220px', maxWidth: isMobile ? '140px' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {title}
            </h2>
            <button style={s.navBtn} onClick={next}>›</button>
            {!isMobile && (
              <button
                style={{ ...s.navBtn, fontSize: '12px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                onClick={() => setCurrentDate(new Date())}
              >
                Aujourd'hui
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
            <button style={s.viewBtn(view === 'month')} onClick={() => setView('month')}>Mois</button>
            {!isMobile && (
              <button style={s.viewBtn(view === 'week')} onClick={() => setView('week')}>Semaine</button>
            )}
            <button
              onClick={() => openNewEvent(formatDateStr(new Date()))}
              style={{
                background: 'var(--accent)', border: 'none', color: '#05130d',
                fontWeight: 700, borderRadius: '8px', padding: isMobile ? '7px 12px' : '8px 16px',
                cursor: 'pointer', fontSize: '13px',
              }}
            >
              + Événement
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: isMobile ? '12px 16px' : '14px 20px', borderBottom: '1px solid var(--border)' }}>
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: color.border,
              }} />
              <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{type}</span>
            </div>
          ))}
        </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
          Chargement...
        </div>
      ) : view === 'month' ? (
        // ── MONTH VIEW ────────────────────────────────────────────────────
        <div style={{
          height: isMobile ? 'calc(100dvh - 200px)' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible',
        }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS_FR.map(d => (
              <div key={d} style={{
                padding: isMobile ? '6px 2px' : '10px', textAlign: 'center',
                color: 'var(--text-3)', fontSize: isMobile ? '10px' : '12px',
                fontWeight: 600, letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {isMobile ? d.slice(0, 2) : d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {getMonthDays().map((date, i) => {
              const dayEvents = date ? getEventsForDate(date) : []
              const today = date ? isToday(date) : false
              return (
                <div
                  key={i}
                  onClick={() => date && openNewEvent(formatDateStr(date))}
                  style={{
                    height: isMobile ? '70px' : '100px',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: isMobile ? '4px' : '8px',
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: date ? 'pointer' : 'default',
                    background: today ? 'var(--accent-dim)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (date) (e.currentTarget as HTMLDivElement).style.background = today
                      ? 'var(--accent-dim)' : 'var(--bg-hover)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = today
                      ? 'var(--accent-dim)' : 'transparent'
                  }}
                >
                  {date && (
                    <>
                      <div style={{
                        width: isMobile ? '20px' : '26px', height: isMobile ? '20px' : '26px',
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: today ? 'var(--accent)' : 'transparent',
                        color: today ? '#05130d' : 'var(--text-1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isMobile ? '11px' : '13px', fontWeight: today ? 700 : 400,
                        marginBottom: '4px',
                      }}>
                        {date.getDate()}
                      </div>
                      {isMobile ? (
                        <>
                          {dayEvents.slice(0, 1).map(event => {
                            const color = EVENT_COLORS[event.type] || EVENT_COLORS.RDV
                            return (
                              <div
                                key={event.id}
                                onClick={e => openEditEvent(event, e)}
                                style={{
                                  background: color.bg,
                                  border: `1px solid ${color.border}`,
                                  borderRadius: '4px',
                                  padding: '1px 3px',
                                  fontSize: '8px',
                                  color: color.text,
                                  marginBottom: '1px',
                                  maxWidth: '100%',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  opacity: event.status === 'Fait' ? 0.45 : 1,
                                  textDecoration: event.status === 'Fait' ? 'line-through' : 'none',
                                }}
                              >
                                {event.status === 'Fait' ? `✓ ${event.title}` : event.title}
                              </div>
                            )
                          })}
                          {dayEvents.length > 1 && (
                            <div style={{ fontSize: '8px', color: 'var(--text-3)' }}>
                              +{dayEvents.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {dayEvents.slice(0, 3).map(event => {
                            const color = EVENT_COLORS[event.type] || EVENT_COLORS.RDV
                            return (
                              <div
                                key={event.id}
                                onClick={e => openEditEvent(event, e)}
                                style={{
                                  background: color.bg,
                                  border: `1px solid ${color.border}`,
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  color: color.text,
                                  marginBottom: '2px',
                                  maxWidth: '100%',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  opacity: event.status === 'Fait' ? 0.45 : 1,
                                  textDecoration: event.status === 'Fait' ? 'line-through' : 'none',
                                }}
                              >
                                {event.status === 'Fait' ? `✓ ${event.title}` : event.title}
                              </div>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                              +{dayEvents.length - 3} autres
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // ── WEEK VIEW ─────────────────────────────────────────────────────
        <div style={{ overflowX: 'auto' }}>
        <div style={{
          minWidth: isMobile ? '700px' : 'auto',
        }}>
          {/* Week header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(7, 1fr)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ padding: '10px' }} />
            {getWeekDays().map((date, i) => {
              const today = isToday(date)
              return (
                <div key={i} style={{
                  padding: '10px',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--border)',
                }}>
                  <p style={{
                    color: 'var(--text-3)', fontSize: '11px',
                    textTransform: 'uppercase', margin: '0 0 4px',
                  }}>
                    {DAYS_FR[i]}
                  </p>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: today ? 'var(--accent)' : 'transparent',
                    color: today ? '#05130d' : 'var(--text-1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 600,
                    margin: '0 auto',
                  }}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Time slots */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {HOURS.map(hour => (
              <div key={hour} style={{
                display: 'grid',
                gridTemplateColumns: '60px repeat(7, 1fr)',
                borderBottom: '1px solid var(--border)',
                minHeight: '60px',
              }}>
                <div style={{
                  padding: '4px 8px',
                  color: 'var(--text-3)',
                  fontSize: '11px',
                  textAlign: 'right',
                  paddingTop: '8px',
                }}>
                  {hour}:00
                </div>
                {getWeekDays().map((date, i) => {
                  const dayEvents = getEventsForDate(date).filter(e => {
                    const h = new Date(e.date).getHours()
                    return h === hour
                  })
                  return (
                    <div
                      key={i}
                      onClick={() => openNewEvent(`${formatDateStr(date)}T${String(hour).padStart(2, '0')}:00`)}
                      style={{
                        borderLeft: '1px solid var(--border)',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        minHeight: '60px',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      {dayEvents.map(event => {
                        const color = EVENT_COLORS[event.type] || EVENT_COLORS.RDV
                        return (
                          <div
                            key={event.id}
                            onClick={e => openEditEvent(event, e)}
                            style={{
                              background: color.bg,
                              border: `1px solid ${color.border}`,
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              color: color.text,
                              cursor: 'pointer',
                              opacity: event.status === 'Fait' ? 0.45 : 1,
                              textDecoration: event.status === 'Fait' ? 'line-through' : 'none',
                            }}
                          >
                            <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{event.status === 'Fait' ? `✓ ${event.title}` : event.title}</p>
                            <p style={{ margin: 0, opacity: 0.8, fontSize: '11px' }}>{event.type}</p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
      </div>

      {/* ── Modal création/édition ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '20px', width: '100%', maxWidth: '480px',
            padding: '28px', fontFamily: 'system-ui, sans-serif',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '24px',
            }}>
              <h2 style={{ color: 'var(--text-1)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-3)',
                cursor: 'pointer', fontSize: '20px',
              }}>✕</button>
            </div>

            {selectedEvent && selectedEvent.status !== 'Fait' && (
              <button
                onClick={async () => {
                  await fetch(`/api/events/${selectedEvent.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ Status: 'Fait' }),
                  })
                  await fetchEvents()
                  setShowModal(false)
                }}
                style={{
                  width: '100%',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent)',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                ✓ Marquer comme fait
              </button>
            )}

            {selectedEvent && selectedEvent.status === 'Fait' && (
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                borderRadius: '10px',
                padding: '10px',
                marginBottom: '16px',
                textAlign: 'center',
                color: 'var(--accent)',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                ✓ Événement réalisé
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type */}
              <div>
                <label style={{ color: 'var(--text-2)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  TYPE
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['RDV', 'Relance', 'Rappel', 'Intervention'].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      style={{
                        background: form.type === t
                          ? (EVENT_COLORS[t]?.bg || 'var(--bg)')
                          : 'var(--bg)',
                        border: '1px solid',
                        borderColor: form.type === t
                          ? (EVENT_COLORS[t]?.border || 'var(--border)')
                          : 'var(--border)',
                        color: form.type === t
                          ? (EVENT_COLORS[t]?.text || 'var(--text-1)')
                          : 'var(--text-2)',
                        borderRadius: '8px', padding: '6px 14px',
                        fontSize: '13px', cursor: 'pointer',
                        fontWeight: form.type === t ? 600 : 400,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label style={{ color: 'var(--text-2)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  TITRE<span style={{ color: '#ef4444' }}> *</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Visite technique Martin"
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Date + Heure */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: 'var(--text-2)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    DATE<span style={{ color: '#ef4444' }}> *</span>
                  </label>
                  <input
                    type="date"
                    value={form.date.split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)',
                      fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-2)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    HEURE
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)',
                      fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ color: 'var(--text-2)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  NOTES (optionnel)
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Informations complémentaires..."
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '10px 12px', color: 'var(--text-1)',
                    fontSize: '14px', outline: 'none', resize: 'vertical',
                    fontFamily: 'system-ui', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex', gap: '10px', marginTop: '20px',
              paddingTop: '16px', borderTop: '1px solid var(--border)',
            }}>
              {selectedEvent && (
                <button
                  onClick={() => deleteEventById(selectedEvent.id)}
                  style={{
                    background: 'var(--badge-lost-bg)', border: '1px solid rgba(239,68,68,0.3)',
                    color: 'var(--badge-lost-text)', borderRadius: '10px', padding: '11px 16px',
                    fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  Supprimer
                </button>
              )}
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-1)', borderRadius: '10px', padding: '11px',
                fontSize: '14px', cursor: 'pointer',
              }}>
                Annuler
              </button>
              <button
                onClick={saveEvent}
                disabled={saving}
                style={{
                  flex: 2, background: saving ? 'var(--text-3)' : 'var(--accent)',
                  border: 'none', color: saving ? 'var(--text-1)' : '#05130d',
                  fontWeight: 700, borderRadius: '10px', padding: '11px',
                  fontSize: '14px', cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Enregistrement...' : selectedEvent ? 'Mettre à jour' : 'Créer l\'événement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
