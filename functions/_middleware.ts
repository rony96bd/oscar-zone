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
  let response = await context.next();
  
  // For SPA: If the file is not found, fetch the root index.html
  if (response.status === 404) {
    const rootUrl = new URL(context.request.url);
    rootUrl.pathname = '/';
    response = await context.env.ASSETS.fetch(new Request(rootUrl));
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('text/html')) {
    return response;
  }

  const url = new URL(context.request.url);
  let path = url.pathname;
  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1);
  }

  let title = '';
  let description = '';

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
    // Create a new response so we can modify it
    const rewriter = new HTMLRewriter()
      .on('title', new MetaRewriter(title, description))
      .on('meta', new MetaRewriter(title, description));
      
    // Transform the response and change status to 200 (if it was a 404 SPA fallback)
    const transformed = rewriter.transform(response);
    return new Response(transformed.body, {
      status: 200,
      headers: transformed.headers
    });
  }

  // If it was a 404 but no title rewrite needed, still return as 200 OK with index.html for SPA
  if (response.status === 404) {
    return new Response(response.body, {
      status: 200,
      headers: response.headers
    });
  }

  return response;
};
