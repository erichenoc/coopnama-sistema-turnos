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
import { toast } from 'sonner'
import { useOrg } from '@/shared/providers/org-provider'

type Tab = 'general' | 'notificaciones' | 'integraciones' | 'cuenta'

interface OrgSettings {
  name: string
  primary_color: string
  timezone: string
  logo_url: string | null
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
  claude_ai: boolean
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
    timezone: 'America/Santo_Domingo',
    logo_url: null,
  })

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    tv_sound_enabled: true,
    tv_voice_enabled: false,
    push_notifications: false,
    sms_backup: false,
  })

  // Integration settings (detected from env)
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    inworld_tts: false,
    whatsapp_n8n: false,
    twilio_sms: false,
    web_push: false,
    claude_ai: false,
  })

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
        .select('name, primary_color, timezone, logo_url')
        .eq('id', organizationId)
        .single()

      if (org) {
        setOrgSettings(org)
      }

      // Fetch notification settings from localStorage
      const storedNotifs = localStorage.getItem('notification_settings')
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs))
      }

      // Fetch real integration status
      const intRes = await fetch('/api/settings/integrations')
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
        .update({
          name: orgSettings.name,
          primary_color: orgSettings.primary_color,
          logo_url: orgSettings.logo_url,
        })
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Configuracion</h1>
        <p className="text-gray-500 mt-1">Administra las preferencias del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
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
                  Color Principal
                </label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={orgSettings.primary_color}
                    onChange={(e) => setOrgSettings({ ...orgSettings, primary_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={orgSettings.primary_color}
                    onChange={(e) => setOrgSettings({ ...orgSettings, primary_color: e.target.value })}
                    placeholder="#1e40af"
                  />
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL del Logo
                </label>
                <Input
                  value={orgSettings.logo_url || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
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
              <p className="text-sm text-gray-500">
                Voz profesional en espanol para anuncios de turnos en pantalla TV y estaciones.
                {integrations.inworld_tts && ' Configurado via variables de entorno (INWORLD_TTS_WRITE_KEY).'}
              </p>
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
              <p className="text-sm text-gray-500">
                Notificaciones por WhatsApp a clientes. Los clientes pueden crear turnos,
                consultar estado y cancelar citas directamente desde WhatsApp.
                {integrations.whatsapp_n8n && ' Webhook n8n configurado.'}
                {!integrations.whatsapp_n8n && ' Configure N8N_WHATSAPP_WEBHOOK_URL en las variables de entorno.'}
              </p>
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
              <p className="text-sm text-gray-500">
                SMS de notificacion cuando se llama el turno de un cliente.
                Soporta numeros dominicanos (809, 829, 849).
                {integrations.twilio_sms && ' Credenciales Twilio configuradas.'}
                {!integrations.twilio_sms && ' Configure TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.'}
              </p>
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
              <p className="text-sm text-gray-500">
                Notificaciones del navegador para clientes y agentes. Funciona en desktop y movil.
                {integrations.web_push && ' Claves VAPID configuradas.'}
                {!integrations.web_push && ' Genere claves con: npx web-push generate-vapid-keys'}
              </p>
            </CardContent>
          </Card>

          {/* Claude AI */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Claude AI</CardTitle>
                <Badge variant={integrations.claude_ai ? 'default' : 'outline'}>
                  {integrations.claude_ai ? 'Conectado' : 'No configurado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Asistente de IA para prediccion de tiempos de espera y sugerencias a agentes.
                {integrations.claude_ai && ' API key de Anthropic configurada.'}
                {!integrations.claude_ai && ' Configure ANTHROPIC_API_KEY en las variables de entorno.'}
              </p>
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
