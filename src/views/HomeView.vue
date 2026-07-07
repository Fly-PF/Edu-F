<script setup>
import request from "@/utils/request";

request
  .post("/api/test1")
  .then((response) => {
    console.log("Response:", response);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
</script>

<template>
  <main>

  </main>
</template>
