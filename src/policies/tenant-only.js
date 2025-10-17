module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user || !user.tenant) {
    return false; // accès refusé
  }

  // injecter le tenant automatiquement
  policyContext.args[0].where = {
    ...policyContext.args[0].where,
    tenant: user.tenant.id,
  };

  return true;
};
