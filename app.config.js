module.exports = ({config}) => {
  const baseUrl = process.env.SCHOOL_WEB_BASE_URL || '';
  if (baseUrl && baseUrl !== '/app') throw new Error('Unsupported School web base path.');
  return {...config, experiments: {...config.experiments, baseUrl}};
};
