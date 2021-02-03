<script>
  import { get } from "svelte/store";
  import { cart } from "../stores/stores.js";
  export let item;
  let { img, name, price } = item;
  img = `img/${img}`;
  const cartItems = get(cart);
  let inCart = cartItems[name] ? cartItems[name].count : 0;
  function addToCart() {
    inCart++;
    cart.update(n => {
      return { ...n, [name]: { ...item, count: inCart } };
    });
  }
</script>



<div class="card">
  <img  class="card-img-top" width="200" src={img} alt={name} />
  <div class="card-body">

  <h5 class="card-title">{name}</h5>
  

  <b class=alert alert-info > $ {price}</b>
  <p class=alert alert-info >{#if inCart > 0}
      <span>
        <em>({inCart} in cart)</em>
      </span>
    {/if}</p> </div>
  <div class="btn-group" role="group">
    <button type="button" class="btn btn-primary" on:click={addToCart}>
      <object
        aria-label="shopping cart"
        type="image/svg+xml"
        data="img/svg/shopping-cart.svg" />
      Add to cart
    </button>
  </div>

  
</div>