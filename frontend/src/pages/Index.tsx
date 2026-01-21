const Index = () => {
  // Redirect to the main landing page
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
  return null;
};

export default Index;
