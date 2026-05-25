FROM nginx:alpine
# Copy default nginx config (we will create it next if needed, but we can just use the default and redirect)
# For simplicity, we just copy the frontend directory to the web root
COPY . /usr/share/nginx/html/frontend
# Create a simple redirect from / to /frontend/trangchu/index.html
RUN echo '<meta http-equiv="refresh" content="0; url=/frontend/trangchu/index.html" />' > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
