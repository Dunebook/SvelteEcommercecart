<script>
	import CardWrapper from "./CartComponents/CardWrapper.svelte";
	import Navbar from "./cartComponents/Navbar.svelte";
	import Checkout from "./cartComponents/Checkout.svelte";
	let nav = "home";
	function navHandler(event) {
	  nav = event.detail.option;
	}
  </script>
  
  <Navbar on:nav={navHandler} />
  {#if nav === 'home'}
	<CardWrapper />
  {:else}
	<Checkout />
  {/if}