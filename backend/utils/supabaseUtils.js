/**
 * Tries multiple join syntaxes to handle different constraint names across environments.
 */
const tryResilientJoin = async (supabase, table, baseSelect, relatedTable, joinOptions, filterFn = (q) => q) => {
  // Possible join suffixes to try
  const suffixes = [
    `!shop_id`,
    `!${table}_shop_id_fkey`,
    `!fk_${table.replace(/s$/, '')}_shop`,
    `!fk_${table}_shop`,
    '' // Default join
  ];

  let lastError;
  for (const suffix of suffixes) {
    try {
      const selectStr = `${baseSelect}, ${relatedTable}${suffix}(${joinOptions})`;
      let query = supabase.from(table).select(selectStr);
      query = filterFn(query);
      
      const { data, error, count } = await query;
      
      if (!error) {
        // Handle array vs single row from query filter
        return { data, count, success: true, usedSuffix: suffix };
      }
      lastError = error;
      // Continue if it's a relationship error
      if (!error.message.includes('relationship') && !error.message.includes('embed')) {
        break; // Other error, stop
      }
    } catch (e) {
      lastError = e;
    }
  }
  return { error: lastError, success: false };
};

module.exports = { tryResilientJoin };
