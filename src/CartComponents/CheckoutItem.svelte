<script>
    import { cart } from "../Stores/stores.js";
    export let item;
    let { name, price, img, count } = item;
    const countButtonHandler = e => {
      if (e.target.classList.contains("add")) {
        count++;
      } else if (count >= 1) {
        count--;
      }
      cart.update(n => ({ ...n, [name]: { ...n[name], count } }));
    };
    const removeItem = () => {
      cart.update(n => {
        delete n[name];
        return n;
      });
    };
  </script>
  
  
  
  <div class="row">
    <img class="img-fluid img-thumbnail" width="300" src={`img/${img}`} alt={name} />
    <div class="item-meta-data">
      <h3 class="title">{name}</h3>
      <p class="price">Price: $ {price}</p>
      <div class="col">
        <button type="button" class="btn btn-success add" on:click={countButtonHandler}>+</button> {' '}
        <span>{count}</span> {' '}
        <button type="button" class="btn btn-warning" on:click={countButtonHandler}>-</button> {' '}
        <button type="button" class="btn btn-danger" on:click={removeItem}> 
          <object
            aria-label="remove"
            type="image/svg+xml"
            data="img/svg/cancel.svg" />
          Remove
        </button>
      </div>
    </div>
  </div>
