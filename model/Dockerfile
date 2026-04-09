# Use busybox as a minimal base image instead of scratch
FROM busybox:stable

# Copy the model file(s) into the /data directory
COPY *.tflite /data/

# Use a shell form command that handles signals properly
CMD sh -c "trap 'exit 0' TERM INT; sleep infinity & wait"