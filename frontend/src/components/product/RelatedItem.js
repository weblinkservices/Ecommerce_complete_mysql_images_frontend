import React, { useState } from 'react';

import "../../App.css";
import { Link } from "react-router-dom";


const RelatedItem = ({ product, RelatedProductImages }) => {


  var imageName;
  if (RelatedProductImages) {
    RelatedProductImages.map((pimg) => {
      if (pimg.product_id === product.id) {
        imageName = pimg.imageName;
        // console.log("imageName",imageName);
      }
    })
  }
  return (
    <div className="">
      <div className="card card1 p-3 rounded">
        <div className="text-center">
          <Link to={`/product/${product.id}`}>
            <img
              className="card-img-top mx-auto"
              alt="card"
              src={imageName}
            />
          </Link>
        </div>
        <div className="card-body d-flex flex-column">
          <h6 className="card-title">
            <Link to={`/product/${product.id}`} title={product.name}>{String(product.name).slice(0, 48)}</Link>
          </h6>
          <div className="ratings mt-auto">
            <div className="rating-outer">
              <div
                className="rating-inner"
                style={{ width: `${(product.ratings / 5) * 100}%` }}
              ></div>
            </div>
            <span id="no_of_reviews">({product.numOfReviews} Reviews)</span>
          </div>
          <p></p>
          <p>
            <span className="card-text">
              &#8377;{product.original_price}{" "}
            </span>
            {product.discount > 0 ? (
              <sub className="text-secondary discount-label">
                /-<del>&#8377;{product.sale_price}</del>,
                <span className="text-success"> {product.discount}% off</span>
              </sub>
            ) : (
              ""
            )}
          </p>

          <Link
            to={`/product/${product.id}`}
            id="view_btn"
            className="btn btn-block"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RelatedItem;
