// Supabase 客户端
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase 配置缺失，请复制 .env.example 为 .env.local 并填入配置')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder')

// 认证辅助函数
export const auth = {
  // 注册
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { user: data.user, error }
  },

  // 登录
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, error }
  },

  // 登出
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // 获取当前用户
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // 监听认证状态
  onAuthChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}
