'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import type { TicketWithRelations, CopilotContext, FollowUpTask } from '../types'

interface FollowUpActionsProps {
  ticket: TicketWithRelations | null
  context: CopilotContext
}

export function FollowUpActions({ ticket, context }: FollowUpActionsProps) {
  const [tasks, setTasks] = useState<FollowUpTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch existing follow-ups for this agent
  useEffect(() => {
    if (!context.agentId) return

    const fetchTasks = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('follow_up_tasks')
          .select('*')
          .eq('agent_id', context.agentId!)
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!error && data) setTasks(data as FollowUpTask[])
      } catch (error) {
        console.error('Error fetching follow-ups:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [context.agentId])

  const addTask = async () => {
    if (!newTask.trim() || !ticket || !context.agentId) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('follow_up_tasks')
        .insert({
          organization_id: context.organizationId,
          ticket_id: ticket.id,
          agent_id: context.agentId,
          member_id: ticket.member_id || null,
          task_description: newTask.trim(),
          priority: 'medium',
        })
        .select('*')
        .single()

      if (!error && data) {
        setTasks((prev) => [data as FollowUpTask, ...prev])
        setNewTask('')
      }
    } catch (error) {
      console.error('Error adding follow-up:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const supabase = createClient()
      await supabase
        .from('follow_up_tasks')
        .update({
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                is_completed: !t.is_completed,
                completed_at: !t.is_completed ? new Date().toISOString() : null,
              }
            : t
        )
      )
    } catch (error) {
      console.error('Error toggling follow-up:', error)
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Acciones de Seguimiento
      </h4>

      {/* Add new task */}
      {ticket?.status === 'serving' && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Nueva accion..."
            className="flex-1 px-3 py-2 rounded-neu-sm shadow-neu-inset text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary"
          />
          <Button
            onClick={addTask}
            variant="primary"
            disabled={saving || !newTask.trim()}
            className="text-xs px-3"
          >
            {saving ? <Spinner size="sm" /> : '+'}
          </Button>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No hay acciones pendientes
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2 p-2 rounded-neu-sm ${
                task.is_completed ? 'bg-gray-100 opacity-60' : 'bg-gray-50 shadow-neu-xs'
              }`}
            >
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleTask(task.id)}
                className="mt-0.5 accent-coopnama-primary"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    task.is_completed
                      ? 'line-through text-gray-400'
                      : 'text-gray-700'
                  }`}
                >
                  {task.task_description}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(task.created_at).toLocaleDateString('es-DO', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
