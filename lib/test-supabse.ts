import { supabase } from './supabase'

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('inspections').select('count(*)')
    if (error) throw error
    console.log('✅ Supabase connected!')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err)
    return false
  }
}