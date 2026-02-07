'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logoutAction } from '@/features/auth/actions/auth-actions'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Toggle,
  Badge,
  Spinner,
} from '@/shared/components'
import { LogoUploader } from '@/features/branding/components/logo-uploader'
import { ColorPicker } from '@/features/branding/components/color-picker'
import { updateBrandingAction } from '@/features/branding/actions/branding-actions'
import { saveIntegrationConfig } from '@/features/integrations/actions/integration-actions'
import { PricingCards } from '@/features/billing/components/pricing-cards'
import { DomainManager } from '@/features/white-label/components/domain-manager'
import { CSSEditor } from '@/features/white-label/components/css-editor'
import { MFASetup } from '@/features/auth/components/mfa-setup'
import { APIKeyManager } from '@/features/api/components/api-key-manager'
import { toast } from 'sonner'
import { useOrg } from '@/shared/providers/org-provider'
import { SLAConfigPanel } from '@/features/sla/components/sla-config-panel'
import { PriorityRulesManager } from '@/features/priority-rules/components/priority-rules-manager'
import { SignageContentManager } from '@/features/tv-signage/components/signage-content-manager'

type Tab = 'general' | 'marca' | 'facturacion' | 'whitelabel' | 'api' | 'sla' | 'prioridad' | 'signage' | 'notificaciones' | 'integraciones' | 'cuenta'

interface OrgSettings {
  name: string
  primary_color: string
  secondary_color: string
  timezone: string
  logo_url: string | null
  custom_css: string | null
  favicon_url: string | null
  meta_title: string | null
  meta_description: string | null
}

interface NotificationSettings {
  tv_sound_enabled: boolean
  tv_voice_enabled: boolean
  push_notifications: boolean
  sms_backup: boolean
}

interface IntegrationStatus {
  inworld_tts: boolean
  whatsapp_n8n: boolean
  twilio_sms: boolean
  web_push: boolean
  openrouter_ai: boolean
  resend_email: boolean
}

interface IntegrationConfig {
  inworld_tts_key: string
  whatsapp_webhook_url: string
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_phone_number: string
  vapid_public_key: string
  vapid_private_key: string
  openrouter_api_key: string
  resend_api_key: string
}

export default function SettingsPage() {
  const { organizationId } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  // General settings
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: '',
    primary_color: '#1e40af',
    secondary_color: '#059669',
    timezone: 'America/Santo_Domingo',
    logo_url: null,
    custom_css: null,
    favicon_url: null,
    meta_title: null,
    meta_description: null,
  })
  const [savingBranding, setSavingBranding] = useState(false)

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    tv_sound_enabled: true,
    tv_voice_enabled: false,
    push_notifications: false,
    sms_backup: false,
  })

  // Integration settings (detected from env + DB)
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    inworld_tts: false,
    whatsapp_n8n: false,
    twilio_sms: false,
    web_push: false,
    openrouter_ai: false,
    resend_email: false,
  })
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({
    inworld_tts_key: '',
    whatsapp_webhook_url: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    vapid_public_key: '',
    vapid_private_key: '',
    openrouter_api_key: '',
    resend_api_key: '',
  })
  const [savingIntegration, setSavingIntegration] = useState<string | null>(null)

  // Password change
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const supabase = createClient()

    try {
      // Fetch user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
      }

      // Fetch organization settings
      const { data: org } = await supabase
        .from('organizations')
        .select('name, primary_color, secondary_color, timezone, logo_url, custom_css, favicon_url, meta_title, meta_description')
        .eq('id', organizationId)
        .single()

      if (org) {
        setOrgSettings({
          name: org.name || '',
          primary_color: org.primary_color || '#1e40af',
          secondary_color: org.secondary_color || '#059669',
          timezone: org.timezone || 'America/Santo_Domingo',
          logo_url: org.logo_url || null,
          custom_css: org.custom_css || null,
          favicon_url: org.favicon_url || null,
          meta_title: org.meta_title || null,
          meta_description: org.meta_description || null,
        })
      }

      // Fetch notification settings from localStorage
      const storedNotifs = localStorage.getItem('notification_settings')
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs))
      }

      // Fetch integration config from DB
      const { data: orgConfig } = await supabase
        .from('organizations')
        .select('integration_config')
        .eq('id', organizationId)
        .single()

      if (orgConfig?.integration_config) {
        const cfg = orgConfig.integration_config as Record<string, string>
        setIntegrationConfig((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(cfg).filter(([, v]) => v !== undefined && v !== null)
          ),
        }))
      }

      // Fetch real integration status (checks env + DB)
      const intRes = await fetch(`/api/settings/integrations?org_id=${organizationId}`)
      if (intRes.ok) {
        setIntegrations(await intRes.json())
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error al cargar configuraciones')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeneral = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgSettings.name })
        .eq('id', organizationId)

      if (error) throw error

      toast.success('Configuracion general guardada')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error al guardar configuracion')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBranding = async () => {
    setSavingBranding(true)
    const result = await updateBrandingAction(organizationId, {
      primary_color: orgSettings.primary_color,
      secondary_color: orgSettings.secondary_color,
      logo_url: orgSettings.logo_url,
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      // Apply colors immediately via CSS variables
      document.documentElement.style.setProperty('--coopnama-primary', orgSettings.primary_color)
      document.documentElement.style.setProperty('--coopnama-secondary', orgSettings.secondary_color)
      toast.success('Marca actualizada exitosamente')
    }
    setSavingBranding(false)
  }

  const handleSaveNotifications = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notifications))
    toast.success('Preferencias de notificaciones guardadas')
  }

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Todos los campos son requeridos')
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast.error('Las contrasenas nuevas no coinciden')
      return
    }

    if (passwords.new.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      })

      if (error) throw error

      toast.success('Contrasena actualizada exitosamente')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Error al cambiar contrasena')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logoutAction()
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'marca', label: 'Marca', icon: '🎨' },
    { id: 'facturacion', label: 'Facturacion', icon: '💳' },
    { id: 'whitelabel', label: 'White-label', icon: '🌐' },
    { id: 'api', label: 'API', icon: '🔗' },
    { id: 'sla', label: 'SLA', icon: '⏱️' },
    { id: 'prioridad', label: 'Prioridad', icon: '🎯' },
    { id: 'signage', label: 'TV Signage', icon: '📺' },
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔' },
    { id: 'integraciones', label: 'Integraciones', icon: '🔌' },
    { id: 'cuenta', label: 'Cuenta', icon: '👤' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`mx-auto p-6 ${activeTab === 'facturacion' ? 'max-w-7xl' : 'max-w-5xl'}`}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Configuracion</h1>
        <p className="text-gray-500 mt-1">Administra las preferencias del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-neu-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-neu-bg shadow-neu-inset text-coopnama-primary'
                : 'bg-neu-bg shadow-neu text-gray-600 hover:text-coopnama-primary'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuracion General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Organizacion
                </label>
                <Input
                  value={orgSettings.name}
                  onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                  placeholder="COOPNAMA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona Horaria
                </label>
                <Input
                  value={orgSettings.timezone}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <Button
                onClick={handleSaveGeneral}
                disabled={saving}
                variant="primary"
                className="w-full"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'marca' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo de la Organizacion</CardTitle>
            </CardHeader>
            <CardContent>
              <LogoUploader
                currentLogoUrl={orgSettings.logo_url}
                organizationId={organizationId}
                onUploaded={(url) => setOrgSettings({ ...orgSettings, logo_url: url })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colores de Marca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <ColorPicker
                  label="Color Primario"
                  value={orgSettings.primary_color}
                  onChange={(color) => setOrgSettings({ ...orgSettings, primary_color: color })}
                />
                <ColorPicker
                  label="Color Secundario"
                  value={orgSettings.secondary_color}
                  onChange={(color) => setOrgSettings({ ...orgSettings, secondary_color: color })}
                />

                {/* Live Preview */}
                <div className="mt-6 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa</p>
                  <div className="flex gap-3">
                    <div
                      className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: orgSettings.primary_color }}
                    >
                      Primario
                    </div>
                    <div
                      className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: orgSettings.secondary_color }}
                    >
                      Secundario
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                  variant="primary"
                  className="w-full"
                >
                  {savingBranding ? 'Guardando...' : 'Guardar Colores'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'facturacion' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan y Facturacion</CardTitle>
            </CardHeader>
            <CardContent>
              <PricingCards />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'whitelabel' && (
        <div className="space-y-6">
          <DomainManager />
          <CSSEditor
            initialCSS={orgSettings.custom_css || ''}
            faviconUrl={orgSettings.favicon_url || null}
            metaTitle={orgSettings.meta_title || null}
            metaDescription={orgSettings.meta_description || null}
          />
        </div>
      )}

      {activeTab === 'api' && (
        <APIKeyManager />
      )}

      {activeTab === 'sla' && (
        <SLAConfigPanel organizationId={organizationId} />
      )}

      {activeTab === 'prioridad' && (
        <PriorityRulesManager organizationId={organizationId} />
      )}

      {activeTab === 'signage' && (
        <SignageContentManager organizationId={organizationId} />
      )}

      {activeTab === 'notificaciones' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferencias de Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Toggle
                checked={notifications.tv_sound_enabled}
                onChange={(e) => setNotifications({ ...notifications, tv_sound_enabled: e.target.checked })}
                label="Sonido en Pantalla TV"
                description="Reproducir sonido cuando se llama un turno"
              />

              <Toggle
                checked={notifications.tv_voice_enabled}
                onChange={(e) => setNotifications({ ...notifications, tv_voice_enabled: e.target.checked })}
                label="Voz con Inworld TTS"
                description="Anuncio por voz profesional en pantalla TV"
              />

              <div className="flex items-start gap-3">
                <Toggle
                  checked={notifications.push_notifications}
                  onChange={(e) => setNotifications({ ...notifications, push_notifications: e.target.checked })}
                  disabled={!integrations.web_push}
                  label="Notificaciones Push"
                  description="Recibir notificaciones en el navegador de clientes"
                />
                {!integrations.web_push && (
                  <Badge variant="outline" className="mt-1 text-xs">Configurar VAPID</Badge>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Toggle
                  checked={notifications.sms_backup}
                  onChange={(e) => setNotifications({ ...notifications, sms_backup: e.target.checked })}
                  disabled={!integrations.twilio_sms}
                  label="SMS de Respaldo"
                  description="Enviar SMS al cliente cuando su turno es llamado"
                />
                {!integrations.twilio_sms && (
                  <Badge variant="outline" className="mt-1 text-xs">Configurar Twilio</Badge>
                )}
              </div>

              <Button
                onClick={handleSaveNotifications}
                variant="primary"
                className="w-full"
              >
                Guardar Preferencias
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'integraciones' && (
        <div className="space-y-4">
          {/* Inworld TTS */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inworld TTS (Voz)</CardTitle>
                <Badge variant={integrations.inworld_tts ? 'default' : 'outline'}>
                  {integrations.inworld_tts ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Voz profesional en espanol para anuncios de turnos en pantalla TV y estaciones.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <Input
                    type="password"
                    value={integrationConfig.inworld_tts_key}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, inworld_tts_key: e.target.value })}
                    placeholder="Inworld TTS Write Key"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'inworld'}
                  onClick={async () => {
                    setSavingIntegration('inworld')
                    const result = await saveIntegrationConfig(organizationId, { inworld_tts_key: integrationConfig.inworld_tts_key })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('Inworld TTS configurado')
                      setIntegrations((prev) => ({ ...prev, inworld_tts: Boolean(integrationConfig.inworld_tts_key) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'inworld' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp via n8n */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>WhatsApp (via n8n)</CardTitle>
                <Badge variant={integrations.whatsapp_n8n ? 'default' : 'outline'}>
                  {integrations.whatsapp_n8n ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Notificaciones por WhatsApp a clientes via workflow n8n.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                  <Input
                    value={integrationConfig.whatsapp_webhook_url}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, whatsapp_webhook_url: e.target.value })}
                    placeholder="https://n8n.example.com/webhook/..."
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'whatsapp'}
                  onClick={async () => {
                    setSavingIntegration('whatsapp')
                    const result = await saveIntegrationConfig(organizationId, { whatsapp_webhook_url: integrationConfig.whatsapp_webhook_url })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('WhatsApp webhook configurado')
                      setIntegrations((prev) => ({ ...prev, whatsapp_n8n: Boolean(integrationConfig.whatsapp_webhook_url) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'whatsapp' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Twilio SMS */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Twilio SMS</CardTitle>
                <Badge variant={integrations.twilio_sms ? 'default' : 'outline'}>
                  {integrations.twilio_sms ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                SMS de notificacion cuando se llama el turno. Soporta numeros dominicanos (809, 829, 849).
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
                  <Input
                    value={integrationConfig.twilio_account_sid}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, twilio_account_sid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                  <Input
                    type="password"
                    value={integrationConfig.twilio_auth_token}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, twilio_auth_token: e.target.value })}
                    placeholder="Auth Token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Telefono</label>
                  <Input
                    value={integrationConfig.twilio_phone_number}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, twilio_phone_number: e.target.value })}
                    placeholder="+18091234567"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'twilio'}
                  onClick={async () => {
                    setSavingIntegration('twilio')
                    const result = await saveIntegrationConfig(organizationId, {
                      twilio_account_sid: integrationConfig.twilio_account_sid,
                      twilio_auth_token: integrationConfig.twilio_auth_token,
                      twilio_phone_number: integrationConfig.twilio_phone_number,
                    })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('Twilio SMS configurado')
                      setIntegrations((prev) => ({ ...prev, twilio_sms: Boolean(integrationConfig.twilio_account_sid && integrationConfig.twilio_auth_token) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'twilio' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Web Push */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Web Push Notifications</CardTitle>
                <Badge variant={integrations.web_push ? 'default' : 'outline'}>
                  {integrations.web_push ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Notificaciones del navegador para clientes y agentes. Funciona en desktop y movil.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAPID Public Key</label>
                  <Input
                    value={integrationConfig.vapid_public_key}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, vapid_public_key: e.target.value })}
                    placeholder="Public key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAPID Private Key</label>
                  <Input
                    type="password"
                    value={integrationConfig.vapid_private_key}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, vapid_private_key: e.target.value })}
                    placeholder="Private key"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'vapid'}
                  onClick={async () => {
                    setSavingIntegration('vapid')
                    const result = await saveIntegrationConfig(organizationId, {
                      vapid_public_key: integrationConfig.vapid_public_key,
                      vapid_private_key: integrationConfig.vapid_private_key,
                    })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('Web Push configurado')
                      setIntegrations((prev) => ({ ...prev, web_push: Boolean(integrationConfig.vapid_public_key && integrationConfig.vapid_private_key) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'vapid' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OpenRouter AI */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>OpenRouter AI</CardTitle>
                <Badge variant={integrations.openrouter_ai ? 'default' : 'outline'}>
                  {integrations.openrouter_ai ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                IA para prediccion de tiempos, copilot de agentes, analisis de sentimiento y chatbot. Soporta 300+ modelos via OpenRouter.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OpenRouter API Key</label>
                  <Input
                    type="password"
                    value={integrationConfig.openrouter_api_key}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, openrouter_api_key: e.target.value })}
                    placeholder="sk-or-..."
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'openrouter'}
                  onClick={async () => {
                    setSavingIntegration('openrouter')
                    const result = await saveIntegrationConfig(organizationId, { openrouter_api_key: integrationConfig.openrouter_api_key })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('OpenRouter AI configurado')
                      setIntegrations((prev) => ({ ...prev, openrouter_ai: Boolean(integrationConfig.openrouter_api_key) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'openrouter' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resend Email */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resend Email</CardTitle>
                <Badge variant={integrations.resend_email ? 'default' : 'outline'}>
                  {integrations.resend_email ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Envio de emails transaccionales (confirmaciones, recordatorios de citas).
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resend API Key</label>
                  <Input
                    type="password"
                    value={integrationConfig.resend_api_key}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, resend_api_key: e.target.value })}
                    placeholder="re_..."
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={savingIntegration === 'resend'}
                  onClick={async () => {
                    setSavingIntegration('resend')
                    const result = await saveIntegrationConfig(organizationId, { resend_api_key: integrationConfig.resend_api_key })
                    if (result.error) { toast.error(result.error) } else {
                      toast.success('Resend Email configurado')
                      setIntegrations((prev) => ({ ...prev, resend_email: Boolean(integrationConfig.resend_api_key) }))
                    }
                    setSavingIntegration(null)
                  }}
                >
                  {savingIntegration === 'resend' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'cuenta' && (
        <div className="space-y-4">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacion de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electronico
                </label>
                <Input
                  value={userEmail}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2FA/MFA */}
          <MFASetup />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contrasena</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contrasena Actual
                  </label>
                  <Input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Contrasena
                  </label>
                  <Input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nueva Contrasena
                  </label>
                  <Input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={saving}
                  variant="primary"
                  className="w-full"
                >
                  {saving ? 'Actualizando...' : 'Cambiar Contrasena'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card>
            <CardHeader>
              <CardTitle>Cerrar Sesion</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="w-full"
              >
                Cerrar Sesion
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  La eliminacion de cuenta es permanente y no se puede deshacer.
                </p>
                <Button
                  disabled
                  variant="secondary"
                  className="w-full opacity-50"
                >
                  Eliminar Cuenta (No disponible)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
