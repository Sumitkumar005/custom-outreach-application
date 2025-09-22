const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applySchema() {
  console.log('🔍 Reading schema file...')
  const schemaPath = path.join(__dirname, 'supabase-schema.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found at:', schemaPath)
    process.exit(1)
  }

  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8')
  console.log('✅ Schema file loaded successfully')

  // Split the schema into individual statements
  const statements = schemaSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

  console.log(`📋 Found ${statements.length} SQL statements to execute`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (statement.trim() === '') continue

    try {
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`)
      console.log(`SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)

      const { data, error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
        successCount++
      }
    } catch (err) {
      console.error(`❌ Statement ${i + 1} error:`, err.message)
      errorCount++
    }
  }

  console.log(`\n📊 Schema application complete:`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 All schema statements applied successfully!')
    console.log('Your Supabase database is now ready for production deployment.')
  } else {
    console.log('\n⚠️  Some statements failed. You may need to apply them manually in the Supabase SQL Editor.')
  }
}

// Alternative: Provide manual instructions
function showManualInstructions() {
  console.log('\n📋 MANUAL INSTRUCTIONS:')
  console.log('======================')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to the SQL Editor')
  console.log('3. Copy and paste the contents of supabase-schema.sql')
  console.log('4. Click "Run" to execute the schema')
  console.log('')
  console.log('The schema includes:')
  console.log('- batches table (for email batches)')
  console.log('- contacts table (for individual contacts)')
  console.log('- tracking_events table (for detailed analytics)')
  console.log('- settings table (for application settings)')
  console.log('- Indexes for performance')
  console.log('- Row Level Security policies')
  console.log('- Triggers for auto-updating timestamps')
}

// Run the schema application
console.log('🚀 Supabase Schema Application Tool')
console.log('=====================================')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey.substring(0, 20)}...`)
console.log('')

// Check if we can use the programmatic approach
console.log('🔍 Testing database connection...')
supabase.from('settings').select('*').limit(1).then(({ error }) => {
  if (error && error.message.includes('relation "public.settings" does not exist')) {
    console.log('✅ Database is accessible but tables don\'t exist yet')
    console.log('⏳ Attempting to apply schema programmatically...')

    applySchema().catch(err => {
      console.error('❌ Schema application failed:', err.message)
      console.log('')
      showManualInstructions()
    })
  } else if (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('')
    showManualInstructions()
  } else {
    console.log('✅ Tables already exist! No schema application needed.')
  }
}).catch(err => {
  console.error('❌ Connection test failed:', err.message)
  console.log('')
  showManualInstructions()
})
