const supabase = require('../config/database');

async function getAllProducts() {
  const { data, error } = await supabase
    .from('savings_product')
    .select('*')
    .order('base_rate', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { getAllProducts };
