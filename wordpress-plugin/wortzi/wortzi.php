<?php
/**
 * Plugin Name:       Wortzi
 * Plugin URI:        https://github.com/FizzaMubeen/wortzi
 * Description:       Learn everyday German from Urdu, Hindi or English. Flashcards with pictures, personal word lists, progress tracking and printable PDF reports. Add it to any page with the shortcode [wortzi].
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Fizza Mubeen
 * License:           Proprietary. © 2026 Fizza Mubeen. All rights reserved.
 * Text Domain:       wortzi
 *
 * Privacy: the app runs completely in the visitor's browser. It stores nothing on your server,
 * sets no cookies and loads nothing from outside your site.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WORTZI_VERSION', '1.0.0' );

/**
 * URL of the bundled app.
 */
function wortzi_app_url() {
	return plugins_url( 'app/index.html', __FILE__ );
}

/**
 * [wortzi height="820" link="yes"]
 *
 * height  Height of the app frame in pixels (400–2000). Default 820.
 * link    "yes" shows an "Open full screen" link under the app. Default yes.
 */
function wortzi_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'height' => '820',
			'link'   => 'yes',
		),
		$atts,
		'wortzi'
	);

	$height = max( 400, min( 2000, absint( $atts['height'] ) ) );
	$url    = wortzi_app_url() . '?v=' . rawurlencode( WORTZI_VERSION ) . '#today';

	$html  = '<div class="wortzi-embed" style="max-width:100%;">';
	$html .= sprintf(
		'<iframe src="%1$s" title="%2$s" loading="lazy" style="width:100%%;height:%3$dpx;max-height:92vh;border:0;border-radius:16px;display:block;" referrerpolicy="no-referrer"></iframe>',
		esc_url( $url ),
		esc_attr__( 'Wortzi – learn German', 'wortzi' ),
		$height
	);
	if ( 'yes' === strtolower( $atts['link'] ) ) {
		$html .= sprintf(
			'<p style="text-align:right;font-size:14px;margin:6px 0 0;"><a href="%1$s" target="_blank" rel="noopener">%2$s</a></p>',
			esc_url( wortzi_app_url() ),
			esc_html__( 'Open full screen ↗', 'wortzi' )
		);
	}
	$html .= '</div>';

	return $html;
}
add_shortcode( 'wortzi', 'wortzi_shortcode' );
add_shortcode( 'german_bridge', 'wortzi_shortcode' ); // old name keeps working

/**
 * Small help box on the Plugins screen.
 */
function wortzi_row_meta( $links, $file ) {
	if ( plugin_basename( __FILE__ ) === $file ) {
		$links[] = esc_html__( 'Use shortcode: [wortzi]', 'wortzi' );
		$links[] = '<a href="' . esc_url( wortzi_app_url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Open the app', 'wortzi' ) . '</a>';
	}
	return $links;
}
add_filter( 'plugin_row_meta', 'wortzi_row_meta', 10, 2 );
