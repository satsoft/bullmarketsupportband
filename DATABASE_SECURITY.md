# 🔒 Database Security Configuration

## Supabase Security Checklist

### Row Level Security (RLS) Policies

**CRITICAL**: Ensure RLS is enabled on all tables. Current tables requiring RLS:

1. **cryptocurrencies** - ✅ READ-ONLY for public
   ```sql
   -- Allow read access to active cryptocurrencies
   CREATE POLICY "Allow public read access to active cryptocurrencies"
   ON cryptocurrencies FOR SELECT
   USING (is_active = true);
   ```

2. **daily_prices** - ✅ READ-ONLY for public
   ```sql
   -- Allow read access to recent daily prices
   CREATE POLICY "Allow public read access to daily prices"
   ON daily_prices FOR SELECT
   USING (date >= CURRENT_DATE - INTERVAL '30 days');
   ```

3. **bmsb_calculations** - ✅ READ-ONLY for public
   ```sql
   -- Allow read access to recent BMSB calculations
   CREATE POLICY "Allow public read access to BMSB calculations"
   ON bmsb_calculations FOR SELECT
   USING (calculation_date >= CURRENT_DATE - INTERVAL '7 days');
   ```

4. **exchange_mappings** - ✅ READ-ONLY for public
   ```sql
   -- Allow read access to available exchange mappings
   CREATE POLICY "Allow public read access to exchange mappings"
   ON exchange_mappings FOR SELECT
   USING (is_available = true);
   ```

5. **market_cap_rankings** - ✅ READ-ONLY for public
   ```sql
   -- Allow read access to recent rankings
   CREATE POLICY "Allow public read access to market cap rankings"
   ON market_cap_rankings FOR SELECT
   USING (recorded_at >= CURRENT_DATE - INTERVAL '7 days');
   ```

### API Key Permissions

#### Anon Key (PUBLIC_SUPABASE_ANON_KEY)
- **Permissions**: SELECT only on public-facing data
- **Tables**: cryptocurrencies, daily_prices, bmsb_calculations, exchange_mappings, market_cap_rankings
- **Restrictions**: Only recent data (7-30 days max)
- **Rate Limiting**: Handled by application layer

#### Service Role Key (SUPABASE_SERVICE_ROLE_KEY)
- **Permissions**: Full access for admin operations
- **Usage**: Scripts, admin endpoints, data ingestion
- **Security**: Only accessible by authenticated admin operations
- **Environment**: Server-side only, never exposed to client

### Database Indexes for Performance

```sql
-- Performance indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_cryptocurrencies_rank ON cryptocurrencies(current_rank);
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_bmsb_calc_date ON bmsb_calculations(calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_mappings_crypto ON exchange_mappings(cryptocurrency_id);
```

### Connection Security

1. **Connection Pooling**: Configured in Supabase project settings
2. **SSL**: Enforced by default on all connections
3. **Network Access**: Restrict to production domains only
4. **API Gateway**: Built-in rate limiting and DDoS protection

### Monitoring & Alerts

1. **Database Metrics**: Monitor query performance and connection usage
2. **Security Events**: Alert on unusual access patterns
3. **Resource Usage**: Monitor database size and API usage
4. **Backup Status**: Ensure automated backups are enabled

### Production Security Checklist

- [ ] Enable RLS on all tables
- [ ] Configure appropriate policies for public read access
- [ ] Restrict service role key usage to admin operations only
- [ ] Add performance indexes for frequent queries
- [ ] Enable database activity logging
- [ ] Configure automated backups
- [ ] Set up monitoring alerts for unusual activity
- [ ] Test API rate limiting under load
- [ ] Validate that no sensitive data is exposed via anon key
- [ ] Ensure connection limits are appropriately configured

### Security Best Practices

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Regular Key Rotation**: Rotate service keys quarterly
3. **Environment Separation**: Different keys for staging/production
4. **Audit Logs**: Regular review of database access patterns
5. **Data Retention**: Implement automatic cleanup of old data
6. **Backup Testing**: Regularly test backup and restore procedures

### Emergency Procedures

1. **Key Compromise**: Immediately rotate affected keys
2. **DDoS Attack**: Enable additional rate limiting via Supabase dashboard
3. **Data Breach**: Review RLS policies and access logs
4. **Performance Issues**: Scale database resources and optimize queries

---

**Status**: Phase 2 security review completed ✅
**Last Updated**: Production launch preparation
**Next Review**: After initial production deployment