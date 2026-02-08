'use client'

import { Fragment } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { useCopilotStore } from '../store/copilot-store'
import { useCopilotSettings } from '../hooks/use-copilot-settings'
import { useVoiceDictation } from '../hooks/use-voice-dictation'
import { SLAAlertBanner } from './sla-alert-banner'
import { AgentMetricsSidebar } from './agent-metrics-sidebar'
import { CopilotChat } from './copilot-chat'
import { Member360Card } from './member-360-card'
import { SimilarCases } from './similar-cases'
import { ServiceScripts } from './service-scripts'
import { PostServiceSummary } from './post-service-summary'
import { TransferRecommendation } from './transfer-recommendation'
import { FollowUpActions } from './follow-up-actions'
import { CrossSellSuggestions } from './cross-sell-suggestions'
import { QuickActionsBar } from './quick-actions-bar'
import { NewAgentModeWrapper } from './new-agent-mode-wrapper'
import type { CopilotPanelProps, CopilotTab } from '../types'

const TABS: { key: CopilotTab; label: string }[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'member', label: 'Miembro' },
  { key: 'kb', label: 'KB/Guias' },
  { key: 'actions', label: 'Acciones' },
]

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-neu-sm text-xs font-medium transition-colors ${
        active
          ? 'bg-coopnama-primary text-white shadow-neu-sm'
          : 'text-gray-600 hover:text-coopnama-primary'
      }`}
    >
      {children}
    </button>
  )
}

export function CopilotPanel({ ticket, notes, callbacks, context }: CopilotPanelProps) {
  const { activeTab, setActiveTab } = useCopilotStore()
  const { newAgentMode, toggleNewAgentMode } = useCopilotSettings()
  const voice = useVoiceDictation()

  const renderContent = (children: React.ReactNode) =>
    newAgentMode ? (
      <NewAgentModeWrapper activeTab={activeTab}>{children}</NewAgentModeWrapper>
    ) : (
      <Fragment>{children}</Fragment>
    )

  return (
    <Card className="bg-neu-bg shadow-neu-sm rounded-neu-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Copiloto IA
          </CardTitle>
          <button
            onClick={toggleNewAgentMode}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              newAgentMode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={newAgentMode ? 'Desactivar modo guiado' : 'Activar modo guiado'}
          >
            {newAgentMode ? 'Guia ON' : 'Guia'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* SLA Alert - always visible when active */}
        <SLAAlertBanner ticket={ticket} context={context} />

        {/* Agent Metrics Mini Bar */}
        <AgentMetricsSidebar agentId={context.agentId} />

        {/* Tab Buttons */}
        <div className="flex gap-1 mb-3 border-b border-gray-200 pb-2 mt-2 overflow-x-auto">
          {TABS.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px] max-h-[500px] overflow-y-auto">
          {renderContent(
            <>
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <CopilotChat
                    ticket={ticket}
                    notes={notes}
                    callbacks={callbacks}
                  />
                  <CrossSellSuggestions ticket={ticket} context={context} />
                </div>
              )}

              {activeTab === 'member' && (
                <div className="space-y-4">
                  <Member360Card ticket={ticket} />
                  <SimilarCases
                    ticket={ticket}
                    organizationId={context.organizationId}
                  />
                </div>
              )}

              {activeTab === 'kb' && (
                <ServiceScripts ticket={ticket} context={context} />
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <PostServiceSummary
                    ticket={ticket}
                    notes={notes}
                    callbacks={callbacks}
                    context={context}
                  />
                  <TransferRecommendation
                    ticket={ticket}
                    notes={notes}
                    callbacks={callbacks}
                    context={context}
                  />
                  <FollowUpActions ticket={ticket} context={context} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions Bar - visible when serving */}
        {ticket?.status === 'serving' && (
          <QuickActionsBar
            callbacks={callbacks}
            notes={notes}
            isVoiceSupported={voice.isSupported}
            isListening={voice.isListening}
            onToggleVoice={
              voice.isListening ? voice.stopListening : voice.startListening
            }
            voiceTranscript={voice.transcript}
          />
        )}
      </CardContent>
    </Card>
  )
}
