from django.http import HttpResponse


def swagger_ui_view(request):
    return HttpResponse(
        """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OrcaCloud API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/schema/',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>
        """.strip(),
        content_type='text/html',
    )


def redoc_view(request):
    return HttpResponse(
        """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OrcaCloud API Reference</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <redoc spec-url="/api/v1/schema/"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
        """.strip(),
        content_type='text/html',
    )
