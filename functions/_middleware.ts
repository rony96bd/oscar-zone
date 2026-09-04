class MetaRewriter {
  title: string;
  description: string | undefined;

  constructor(title: string, description?: string) {
    this.title = title;
    this.description = description;
  }

  element(element: any) {
    if (element.tagName === 'title') {
      element.setInnerContent(this.title);
    } else if (element.tagName === 'meta') {
      const prop = element.getAttribute('property');
      const name = element.getAttribute('name');
      
      if (prop === 'og:title' || name === 'twitter:title') {
        element.setAttribute('content', this.title);
      }
      if (this.description && (prop === 'og:description' || name === 'twitter:description' || name === 'description')) {
        element.setAttribute('content', this.description);
      }
    }
  }
}

export const onRequest = async (context: any) => {
  const response = await context.next();
  
  // Only intercept HTML responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('text/html')) {
    return response;
  }

  const url = new URL(context.request.url);
  const path = url.pathname;

  let title = '';
  let description = '';

  // Determine metadata based on route
  if (path === '/payment-tags') {
    title = 'Payment Tags - Oscar Zone';
    description = 'View our active payment tags, crypto addresses, and payment links.';
  } else if (path === '/winners-circle') {
    title = 'Winners Circle - Oscar Zone';
    description = 'Check out our latest winners and cashout proofs.';
  } else if (path === '/load') {
    title = 'Load Game - Oscar Zone';
  } else if (path === '/games') {
    title = 'Games - Oscar Zone';
  } else if (path === '/promotions') {
    title = 'Promotions - Oscar Zone';
  }

  if (title) {
    const rewriter = new HTMLRewriter()
      .on('title', new MetaRewriter(title, description))
      .on('meta', new MetaRewriter(title, description));
      
    return rewriter.transform(response);
  }

  return response;
};
