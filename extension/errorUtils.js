window.getFriendlyAiErrorMessage = function(error, fallbackAction = 'continue') {
  const code = error?.code || error?.data?.code;
  const status = error?.status;
  const msg = error?.message?.toLowerCase() || '';

  if (status === 402 || code === 'INSUFFICIENT_COINS' || msg.includes('coin') || msg.includes('credit')) {
    if (fallbackAction === 'dashboard') {
      return 'Insufficient coins. Please open the Dashboard to top up or upgrade your plan.';
    }
    return `Insufficient coins. Please upgrade your plan or top up to ${fallbackAction}.`;
  } else if (code === 'AI_TIMEOUT') {
    return 'Our AI took too long to respond. Please try again.';
  } else if (code === 'AI_OVERLOAD') {
    return 'The Google AI service is currently overloaded. Please try again in a few moments.';
  }

  return null;
}
