<script>
    import { cart } from "../Stores/stores.js";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    let cart_sum = 0;
    const unsubscribe = cart.subscribe(items => {
      const itemValues = Object.values(items);
      cart_sum = 0;
      itemValues.forEach(item => {
        cart_sum += item.count;
      });
    });
    function goToHome() {
      dispatch("nav", {
        option: "home"
      });
    }
    function goToCheckout() {
      dispatch("nav", {
        option: "checkout"
      });
    }
  </script>
  


  <nav class="navbar navbar-dark bg-primary navbar-expand-lg navbar-dark ">
    <div class="container">

      <a class="navbar-brand logo-font" id="brand" on:click={goToHome}> SvelteCart </a>  
      
    
      
        
        <div class="collapse navbar-collapse" id="links">
            <ul class="navbar-nav mr-auto">
              
                <li class="nav-item">
                    <a class="nav-link" href="#"> Electronics</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">customer care</a>
                </li>

            </ul>
        </div>
            <ul class="navbar-nav ml-auto">
                <li class="nav-item active"><a class="nav-link" on:click={goToCheckout}>Items in Cart
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-cart-dash-fill" viewBox="0 0 16 16">
                    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM6.5 7h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1z"/>
                  </svg>
                </a></li>
                <li class="nav-link active"> {#if cart_sum > 0} {cart_sum}
                  {/if} </li>
            </ul>
        </div>
</nav>

<br>
